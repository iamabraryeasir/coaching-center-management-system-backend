import { Role } from '@prisma/client';
import { prisma } from '../../../config';
import { ApiError, generateReceiptPdfBuffer } from '../../../utils';

export const getReceiptPdfService = async (
  receiptIdOrTransactionId: string,
  requestingUserId: string,
  requestingUserRole: Role,
): Promise<{ buffer: Buffer; filename: string }> => {
  const receipt = await prisma.receipt.findFirst({
    where: {
      OR: [{ id: receiptIdOrTransactionId }, { transactionId: receiptIdOrTransactionId }],
    },
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

  if (requestingUserRole === Role.STUDENT && receipt.transaction.studentId !== requestingUserId) {
    throw ApiError.forbidden('You are not authorized to access this receipt');
  }

  const pdfBuffer = await generateReceiptPdfBuffer({
    receiptNumber: receipt.receiptNumber,
    issuedAt: receipt.issuedAt,
    paidAt: receipt.transaction.paidAt,
    amount: Number(receipt.transaction.amount),
    currency: receipt.transaction.currency,
    paymentMethod: receipt.transaction.paymentMethod,
    status: receipt.transaction.status,
    transactionId: receipt.transaction.id,
    student: receipt.transaction.student,
    batch: {
      id: receipt.transaction.batch.id,
      name: receipt.transaction.batch.name,
      fee: Number(receipt.transaction.batch.fee),
    },
  });

  return {
    buffer: pdfBuffer,
    filename: `Receipt-${receipt.receiptNumber}.pdf`,
  };
};
