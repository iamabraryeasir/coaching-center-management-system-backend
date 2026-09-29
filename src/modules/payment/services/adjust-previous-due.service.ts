import { PaymentBillStatus } from '@prisma/client';
import { prisma } from '../../../config';
import { ApiError, logger } from '../../../utils';
import type { IAdjustPreviousDuePayload, IAdjustPreviousDueResponse } from '../payment.interface';

/**
 * Manually adjusts the previous due amount of a student's monthly fee bill.
 * Automatically recalculates total payable, due balance, and bill payment status inside a transaction.
 */
export const adjustPreviousDue = async (
  billId: string,
  payload: IAdjustPreviousDuePayload,
  adminId: string,
): Promise<IAdjustPreviousDueResponse> => {
  const bill = await prisma.monthlyFeeBill.findUnique({
    where: { id: billId },
    include: {
      batch: true,
      student: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      enrollment: true,
    },
  });

  if (!bill) {
    throw ApiError.notFound('Monthly fee bill not found.');
  }

  const monthlyFee = Number(bill.monthlyFee);
  const currentPaid = Number(bill.paidAmount);
  const oldPreviousDue = Number(bill.previousDue);
  const newPreviousDue = payload.previousDue;

  const newTotalPayable = monthlyFee + newPreviousDue;

  if (currentPaid > newTotalPayable) {
    throw ApiError.badRequest(
      `Adjusted previous due results in total payable (${newTotalPayable} BDT) less than the already paid amount (${currentPaid} BDT).`,
    );
  }

  const newDueAmount = newTotalPayable - currentPaid;
  let newStatus: PaymentBillStatus = PaymentBillStatus.UNPAID;

  if (newDueAmount === 0) {
    newStatus = PaymentBillStatus.PAID;
  } else if (currentPaid > 0) {
    newStatus = PaymentBillStatus.PARTIAL;
  } else {
    newStatus = PaymentBillStatus.UNPAID;
  }

  const updatedBill = await prisma.$transaction(async (tx) => {
    const updated = await tx.monthlyFeeBill.update({
      where: { id: billId },
      data: {
        previousDue: newPreviousDue,
        totalPayable: newTotalPayable,
        dueAmount: newDueAmount,
        status: newStatus,
      },
      include: {
        batch: { select: { id: true, name: true, fee: true } },
        student: { select: { id: true, name: true, email: true } },
        enrollment: true,
      },
    });

    // Record immutable audit log
    await tx.auditLog.create({
      data: {
        userId: adminId,
        action: 'PREVIOUS_DUE_ADJUSTED',
        entity: 'MonthlyFeeBill',
        entityId: bill.id,
        details: JSON.stringify({
          studentId: bill.studentId,
          studentName: bill.student.name,
          batchId: bill.batchId,
          batchName: bill.batch.name,
          billingMonth: bill.billingMonth,
          billingYear: bill.billingYear,
          oldPreviousDue,
          newPreviousDue,
          oldTotalPayable: Number(bill.totalPayable),
          newTotalPayable,
          oldDueAmount: Number(bill.dueAmount),
          newDueAmount,
          oldStatus: bill.status,
          newStatus,
          reason: payload.reason || null,
        }),
      },
    });

    return updated;
  });

  logger.audit('PREVIOUS_DUE_ADJUSTED', {
    billId: bill.id,
    studentId: bill.studentId,
    batchId: bill.batchId,
    oldPreviousDue,
    newPreviousDue,
    adminId,
    reason: payload.reason,
  });

  return {
    id: updatedBill.id,
    studentId: updatedBill.studentId,
    student: updatedBill.student,
    batchId: updatedBill.batchId,
    batch: {
      id: updatedBill.batch.id,
      name: updatedBill.batch.name,
      fee: Number(updatedBill.batch.fee),
    },
    enrollmentId: updatedBill.enrollmentId,
    billingMonth: updatedBill.billingMonth,
    billingYear: updatedBill.billingYear,
    monthlyFee: Number(updatedBill.monthlyFee),
    previousDue: Number(updatedBill.previousDue),
    totalPayable: Number(updatedBill.totalPayable),
    paidAmount: Number(updatedBill.paidAmount),
    dueAmount: Number(updatedBill.dueAmount),
    status: updatedBill.status,
    createdAt: updatedBill.createdAt,
    updatedAt: updatedBill.updatedAt,
  };
};
