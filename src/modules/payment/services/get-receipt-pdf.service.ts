import { Role } from '@prisma/client';
import { prisma } from '../../../config';
import { ApiError, generateReceiptPdfBuffer } from '../../../utils';

export const getReceiptPdf = async (
  transactionId: string,
  user: { userId: string; role: Role },
): Promise<{ buffer: Buffer; filename: string }> => {
  const tx = await prisma.paymentTransaction.findUnique({
    where: { id: transactionId },
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
      monthlyFeeBill: true,
    },
  });

  if (!tx) {
    throw ApiError.notFound('Payment transaction record not found.');
  }

  if (user.role === Role.STUDENT && tx.studentId !== user.userId) {
    throw ApiError.forbidden('You are not authorized to access another student’s payment receipt.');
  }

  const pdfBuffer = await generateReceiptPdfBuffer({
    receiptNumber: tx.receiptNumber,
    issuedAt: tx.createdAt,
    paidAt: tx.paidAt,
    amount: Number(tx.amount),
    currency: tx.currency.toUpperCase(),
    paymentMethod: tx.paymentMethod,
    status: tx.status,
    transactionId: tx.id,
    billingMonth: tx.monthlyFeeBill?.billingMonth,
    billingYear: tx.monthlyFeeBill?.billingYear,
    notes: tx.notes,
    totalPaidForMonth: tx.monthlyFeeBill ? Number(tx.monthlyFeeBill.paidAmount) : undefined,
    remainingMonthDue: tx.monthlyFeeBill ? Number(tx.monthlyFeeBill.dueAmount) : undefined,
    effectiveMonthlyFee: tx.monthlyFeeBill ? Number(tx.monthlyFeeBill.monthlyFee) : undefined,
    student: {
      id: tx.student.id,
      name: tx.student.name,
      email: tx.student.email,
      phone: tx.student.phone,
    },
    batch: {
      id: tx.batch.id,
      name: tx.batch.name,
      fee: Number(tx.batch.fee),
    },
  });

  return {
    buffer: pdfBuffer,
    filename: `Receipt-${tx.receiptNumber}.pdf`,
  };
};
