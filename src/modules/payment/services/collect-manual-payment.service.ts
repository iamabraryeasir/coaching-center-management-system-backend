import { EnrollmentStatus, PaymentStatus, Role } from '@prisma/client';
import { prisma } from '../../../config';
import {
  ApiError,
  generateReceiptPdfBuffer,
  logger,
  sendPaymentReceiptEmail,
} from '../../../utils';
import type { IManualPaymentInput, IReceiptResponse } from '../payment.interface';
import { formatBillingPeriod, generateReceiptNumber } from '../payment.utils';

export const collectManualPaymentService = async (
  input: IManualPaymentInput,
): Promise<IReceiptResponse> => {
  const { studentId, batchId, billingMonth, billingYear, amount, paymentMethod, notes } = input;

  const student = await prisma.user.findFirst({
    where: {
      id: studentId,
      role: Role.STUDENT,
      deletedAt: null,
    },
  });

  if (!student) {
    throw ApiError.notFound('Student not found');
  }

  const batch = await prisma.batch.findFirst({
    where: {
      id: batchId,
      deletedAt: null,
    },
  });

  if (!batch) {
    throw ApiError.notFound('Batch not found');
  }

  const existingPaid = await prisma.paymentTransaction.findFirst({
    where: {
      studentId,
      batchId,
      billingMonth,
      billingYear,
      status: PaymentStatus.COMPLETED,
    },
  });

  if (existingPaid) {
    throw ApiError.conflict(
      `Monthly fee for ${formatBillingPeriod(billingMonth, billingYear)} has already been paid for this batch`,
    );
  }

  const receiptNumber = generateReceiptNumber();
  const billingPeriod = formatBillingPeriod(billingMonth, billingYear);

  const receiptResponse = await prisma.$transaction(async (tx) => {
    const transaction = await tx.paymentTransaction.create({
      data: {
        studentId,
        batchId,
        billingMonth,
        billingYear,
        amount,
        currency: 'bdt',
        paymentMethod,
        status: PaymentStatus.COMPLETED,
        paidAt: new Date(),
        notes: notes || null,
      },
    });

    await tx.enrollment.upsert({
      where: {
        batchId_studentId: {
          batchId,
          studentId,
        },
      },
      update: {
        status: EnrollmentStatus.ENROLLED,
      },
      create: {
        studentId,
        batchId,
        status: EnrollmentStatus.ENROLLED,
        startBillingMonth: billingMonth,
        startBillingYear: billingYear,
      },
    });

    const receipt = await tx.receipt.create({
      data: {
        transactionId: transaction.id,
        receiptNumber,
        issuedAt: new Date(),
      },
    });

    logger.audit('MANUAL_PAYMENT_COLLECTED', {
      transactionId: transaction.id,
      receiptNumber,
      studentId: student.id,
      studentEmail: student.email,
      batchId: batch.id,
      batchName: batch.name,
      billingMonth,
      billingYear,
      billingPeriod,
      amount,
      paymentMethod,
      notes,
    });

    return {
      id: receipt.id,
      receiptNumber: receipt.receiptNumber,
      issuedAt: receipt.issuedAt,
      amount: Number(transaction.amount),
      currency: transaction.currency,
      paymentMethod: transaction.paymentMethod,
      status: transaction.status,
      billingMonth: transaction.billingMonth,
      billingYear: transaction.billingYear,
      billingPeriod,
      notes: transaction.notes,
      student: {
        id: student.id,
        name: student.name,
        email: student.email,
        phone: student.phone,
      },
      batch: {
        id: batch.id,
        name: batch.name,
        fee: Number(batch.fee),
      },
      transactionId: transaction.id,
      paidAt: transaction.paidAt,
      downloadUrl: receipt.downloadUrl,
    };
  });

  // Asynchronous in-memory PDF generation & email dispatch (Zero Cloud Storage)
  generateReceiptPdfBuffer({
    receiptNumber: receiptResponse.receiptNumber,
    issuedAt: receiptResponse.issuedAt,
    paidAt: receiptResponse.paidAt,
    amount: receiptResponse.amount,
    currency: receiptResponse.currency,
    paymentMethod: receiptResponse.paymentMethod,
    status: receiptResponse.status,
    transactionId: receiptResponse.transactionId,
    billingMonth: receiptResponse.billingMonth,
    billingYear: receiptResponse.billingYear,
    notes: receiptResponse.notes,
    student: receiptResponse.student,
    batch: receiptResponse.batch,
  })
    .then((pdfBuffer) => {
      return sendPaymentReceiptEmail(
        student.email,
        student.name,
        receiptResponse.receiptNumber,
        receiptResponse.amount,
        receiptResponse.currency,
        batch.name,
        pdfBuffer,
        billingPeriod,
      );
    })
    .catch((emailErr) => {
      logger.error(
        'Failed to generate/dispatch PDF receipt email for manual collection:',
        emailErr,
      );
    });

  return receiptResponse;
};
