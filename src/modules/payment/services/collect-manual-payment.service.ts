import { EnrollmentStatus, PaymentStatus, Role } from '@prisma/client';
import { prisma } from '../../../config';
import { ApiError, logger } from '../../../utils';
import type { IManualPaymentInput, IReceiptResponse } from '../payment.interface';
import { generateReceiptNumber } from '../payment.utils';

export const collectManualPaymentService = async (
  input: IManualPaymentInput,
): Promise<IReceiptResponse> => {
  const { studentId, batchId, amount, paymentMethod, referenceNumber } = input;

  // 1. Verify student exists and is a STUDENT
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

  // 2. Verify batch exists
  const batch = await prisma.batch.findFirst({
    where: {
      id: batchId,
      deletedAt: null,
    },
  });

  if (!batch) {
    throw ApiError.notFound('Batch not found');
  }

  // 3. Atomically record transaction, activate enrollment, and issue receipt
  return await prisma.$transaction(async (tx) => {
    const receiptNumber = generateReceiptNumber();

    // A. Create Completed Payment Transaction
    const transaction = await tx.paymentTransaction.create({
      data: {
        studentId,
        batchId,
        amount,
        currency: 'bdt',
        paymentMethod,
        status: PaymentStatus.COMPLETED,
        paidAt: new Date(),
        stripePaymentIntentId: referenceNumber || null,
      },
    });

    // B. Activate Student Enrollment in Batch
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
      },
    });

    // C. Create Receipt
    const receipt = await tx.receipt.create({
      data: {
        transactionId: transaction.id,
        receiptNumber,
        issuedAt: new Date(),
      },
    });

    // D. Structured Audit Log
    logger.audit('MANUAL_PAYMENT_COLLECTED', {
      transactionId: transaction.id,
      receiptNumber,
      studentId: student.id,
      studentEmail: student.email,
      batchId: batch.id,
      batchName: batch.name,
      amount,
      paymentMethod,
      referenceNumber,
    });

    return {
      id: receipt.id,
      receiptNumber: receipt.receiptNumber,
      issuedAt: receipt.issuedAt,
      amount: Number(transaction.amount),
      currency: transaction.currency,
      paymentMethod: transaction.paymentMethod,
      status: transaction.status,
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
};
