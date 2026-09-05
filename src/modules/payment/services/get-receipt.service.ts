import { Role } from '@prisma/client';
import { prisma } from '../../../config';
import { ApiError } from '../../../utils';
import type { IReceiptResponse } from '../payment.interface';

export const getReceiptByIdService = async (
  receiptId: string,
  requestingUserId: string,
  requestingUserRole: Role,
): Promise<IReceiptResponse> => {
  const receipt = await prisma.receipt.findUnique({
    where: { id: receiptId },
    include: {
      transaction: {
        include: {
          student: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          batch: {
            select: {
              id: true,
              name: true,
              fee: true,
            },
          },
        },
      },
    },
  });

  if (!receipt) {
    throw ApiError.notFound('Receipt not found');
  }

  // Authorization check: Student can only view their own receipts
  if (requestingUserRole === Role.STUDENT && receipt.transaction.studentId !== requestingUserId) {
    throw ApiError.forbidden('You are not authorized to view this receipt');
  }

  return {
    id: receipt.id,
    receiptNumber: receipt.receiptNumber,
    issuedAt: receipt.issuedAt,
    amount: Number(receipt.transaction.amount),
    currency: receipt.transaction.currency,
    paymentMethod: receipt.transaction.paymentMethod,
    status: receipt.transaction.status,
    student: receipt.transaction.student,
    batch: {
      id: receipt.transaction.batch.id,
      name: receipt.transaction.batch.name,
      fee: Number(receipt.transaction.batch.fee),
    },
    transactionId: receipt.transaction.id,
    paidAt: receipt.transaction.paidAt,
    downloadUrl: receipt.downloadUrl,
  };
};

export const getReceiptByTransactionIdService = async (
  transactionId: string,
  requestingUserId: string,
  requestingUserRole: Role,
): Promise<IReceiptResponse> => {
  const receipt = await prisma.receipt.findUnique({
    where: { transactionId },
    include: {
      transaction: {
        include: {
          student: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          batch: {
            select: {
              id: true,
              name: true,
              fee: true,
            },
          },
        },
      },
    },
  });

  if (!receipt) {
    throw ApiError.notFound('Receipt not found for this transaction');
  }

  // Authorization check
  if (requestingUserRole === Role.STUDENT && receipt.transaction.studentId !== requestingUserId) {
    throw ApiError.forbidden('You are not authorized to view this receipt');
  }

  return {
    id: receipt.id,
    receiptNumber: receipt.receiptNumber,
    issuedAt: receipt.issuedAt,
    amount: Number(receipt.transaction.amount),
    currency: receipt.transaction.currency,
    paymentMethod: receipt.transaction.paymentMethod,
    status: receipt.transaction.status,
    student: receipt.transaction.student,
    batch: {
      id: receipt.transaction.batch.id,
      name: receipt.transaction.batch.name,
      fee: Number(receipt.transaction.batch.fee),
    },
    transactionId: receipt.transaction.id,
    paidAt: receipt.transaction.paidAt,
    downloadUrl: receipt.downloadUrl,
  };
};
