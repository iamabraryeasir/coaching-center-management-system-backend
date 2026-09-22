import { EnrollmentStatus, PaymentBillStatus, PaymentStatus } from '@prisma/client';
import { prisma } from '../../../config';
import {
  ApiError,
  generateReceiptPdfBuffer,
  logger,
  sendPaymentReceiptEmail,
} from '../../../utils';
import type { ICollectManualPaymentPayload } from '../payment.interface';
import {
  assertValidBillingPeriodNotFuture,
  generateReceiptNumber,
  MONTH_NAMES,
} from '../payment.utils';

export const collectManualPayment = async (
  payload: ICollectManualPaymentPayload,
  adminId: string,
): Promise<{
  transactionId: string;
  receiptNumber: string;
  amount: number;
  paymentMethod: string;
  paidAt: Date;
  bill: {
    id: string;
    billingPeriodText: string;
    monthlyFee: number;
    previousDue: number;
    totalPayable: number;
    paidAmount: number;
    dueAmount: number;
    status: PaymentBillStatus;
  };
}> => {
  const { targetMonth, targetYear, periodText } = assertValidBillingPeriodNotFuture(
    payload.billingMonth,
    payload.billingYear,
  );

  const enrollment = await prisma.enrollment.findUnique({
    where: { id: payload.enrollmentId },
    include: {
      student: { select: { id: true, name: true, email: true, phone: true } },
      batch: { select: { id: true, name: true, fee: true, deletedAt: true } },
    },
  });

  if (
    !enrollment ||
    enrollment.status !== EnrollmentStatus.ENROLLED ||
    enrollment.batch.deletedAt
  ) {
    throw ApiError.notFound('Active enrolled student record not found for this enrollment ID.');
  }

  const receiptNumber = generateReceiptNumber(targetYear, targetMonth);

  const result = await prisma.$transaction(async (tx) => {
    // 1. Find or create bill for this period
    let bill = await tx.monthlyFeeBill.findUnique({
      where: {
        enrollmentId_billingYear_billingMonth: {
          enrollmentId: enrollment.id,
          billingYear: targetYear,
          billingMonth: targetMonth,
        },
      },
    });

    if (!bill) {
      // Calculate previous due from prior unpaid months
      const priorBills = await tx.monthlyFeeBill.findMany({
        where: {
          enrollmentId: enrollment.id,
          OR: [
            { billingYear: { lt: targetYear } },
            { billingYear: targetYear, billingMonth: { lt: targetMonth } },
          ],
        },
        select: { dueAmount: true },
      });

      const previousDue = priorBills.reduce((acc, b) => acc + Number(b.dueAmount), 0);
      const monthlyFee = Number(enrollment.batch.fee);
      const totalPayable = monthlyFee + previousDue;

      bill = await tx.monthlyFeeBill.create({
        data: {
          studentId: enrollment.studentId,
          batchId: enrollment.batchId,
          enrollmentId: enrollment.id,
          billingMonth: targetMonth,
          billingYear: targetYear,
          monthlyFee,
          previousDue,
          totalPayable,
          paidAmount: 0.0,
          dueAmount: totalPayable,
          status: PaymentBillStatus.UNPAID,
        },
      });
    }

    const currentDue = Number(bill.dueAmount);
    if (currentDue <= 0 || bill.status === PaymentBillStatus.PAID) {
      throw ApiError.badRequest(
        `This student has already fully paid their tuition fee for ${periodText}. Due amount is ৳ 0.00.`,
      );
    }

    if (payload.amount > currentDue) {
      throw ApiError.badRequest(
        `Payment amount (৳ ${payload.amount}) exceeds the remaining due (৳ ${currentDue.toFixed(2)}) for ${periodText}.`,
      );
    }

    const newPaidAmount = Number(bill.paidAmount) + payload.amount;
    const newDueAmount = currentDue - payload.amount;
    const newStatus = newDueAmount <= 0.001 ? PaymentBillStatus.PAID : PaymentBillStatus.PARTIAL;

    // 2. Update the MonthlyFeeBill
    const updatedBill = await tx.monthlyFeeBill.update({
      where: { id: bill.id },
      data: {
        paidAmount: newPaidAmount,
        dueAmount: newDueAmount,
        status: newStatus,
      },
    });

    // 3. Create the PaymentTransaction
    const transaction = await tx.paymentTransaction.create({
      data: {
        studentId: enrollment.studentId,
        batchId: enrollment.batchId,
        monthlyFeeBillId: bill.id,
        amount: payload.amount,
        currency: 'bdt',
        paymentMethod: payload.paymentMethod,
        status: PaymentStatus.COMPLETED,
        receiptNumber,
        notes: payload.notes || `Manual collection for ${periodText}`,
        collectedById: adminId,
        paidAt: new Date(),
      },
    });

    // 4. Record Audit Log
    await tx.auditLog.create({
      data: {
        userId: adminId,
        action: 'PAYMENT_COLLECTED',
        entity: 'PaymentTransaction',
        entityId: transaction.id,
        details: JSON.stringify({
          receiptNumber,
          studentName: enrollment.student.name,
          studentEmail: enrollment.student.email,
          batchName: enrollment.batch.name,
          amount: payload.amount,
          paymentMethod: payload.paymentMethod,
          billingPeriod: periodText,
          newStatus,
          remainingDue: newDueAmount,
        }),
      },
    });

    return { transaction, updatedBill };
  });

  // 5. Asynchronously generate PDF receipt & dispatch confirmation email
  (async () => {
    try {
      const pdfBuffer = await generateReceiptPdfBuffer({
        receiptNumber,
        issuedAt: new Date(),
        paidAt: result.transaction.paidAt,
        amount: payload.amount,
        currency: 'bdt',
        paymentMethod: payload.paymentMethod,
        status: 'COMPLETED',
        transactionId: result.transaction.id,
        billingMonth: targetMonth,
        billingYear: targetYear,
        notes: payload.notes || null,
        totalPaidForMonth: Number(result.updatedBill.paidAmount),
        remainingMonthDue: Number(result.updatedBill.dueAmount),
        effectiveMonthlyFee: Number(result.updatedBill.monthlyFee),
        student: {
          id: enrollment.student.id,
          name: enrollment.student.name,
          email: enrollment.student.email,
          phone: enrollment.student.phone,
        },
        batch: {
          id: enrollment.batch.id,
          name: enrollment.batch.name,
          fee: Number(enrollment.batch.fee),
        },
      });

      await sendPaymentReceiptEmail(
        enrollment.student.email,
        enrollment.student.name,
        receiptNumber,
        payload.amount,
        'bdt',
        enrollment.batch.name,
        pdfBuffer,
        periodText,
      );
    } catch (err) {
      logger.error('Failed to generate or dispatch receipt email:', err);
    }
  })();

  logger.audit('PAYMENT_COLLECTED', {
    receiptNumber,
    amount: payload.amount,
    studentId: enrollment.studentId,
    batchId: enrollment.batchId,
    period: periodText,
  });

  return {
    transactionId: result.transaction.id,
    receiptNumber,
    amount: payload.amount,
    paymentMethod: payload.paymentMethod,
    paidAt: result.transaction.paidAt,
    bill: {
      id: result.updatedBill.id,
      billingPeriodText: `${MONTH_NAMES[result.updatedBill.billingMonth - 1]} ${result.updatedBill.billingYear}`,
      monthlyFee: Number(result.updatedBill.monthlyFee),
      previousDue: Number(result.updatedBill.previousDue),
      totalPayable: Number(result.updatedBill.totalPayable),
      paidAmount: Number(result.updatedBill.paidAmount),
      dueAmount: Number(result.updatedBill.dueAmount),
      status: result.updatedBill.status,
    },
  };
};
