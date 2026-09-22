import { type Prisma, Role } from '@prisma/client';
import { prisma } from '../../../config';
import { type IPaginationMeta, QueryBuilder } from '../../../utils';
import type { IGetTransactionsQuery } from '../payment.interface';

export const getTransactions = async (
  query: IGetTransactionsQuery,
  user: { userId: string; role: Role },
): Promise<{
  data: Array<{
    id: string;
    studentId: string;
    studentName: string;
    studentEmail: string;
    batchId: string;
    batchName: string;
    monthlyFeeBillId: string | null;
    amount: number;
    currency: string;
    paymentMethod: string;
    status: string;
    receiptNumber: string;
    notes: string | null;
    paidAt: Date;
    collectedByName: string | null;
  }>;
  meta: IPaginationMeta;
}> => {
  const scopedStudentId = user.role === Role.STUDENT ? user.userId : query.studentId;

  const baseWhere = {
    ...(scopedStudentId ? { studentId: scopedStudentId } : {}),
    ...(query.batchId ? { batchId: query.batchId } : {}),
    ...(query.paymentMethod ? { paymentMethod: query.paymentMethod } : {}),
    ...(query.status ? { status: query.status } : {}),
    batch: { deletedAt: null },
    student: { deletedAt: null },
  };

  const qb = new QueryBuilder(query as Record<string, unknown>)
    .where(baseWhere)
    .search(['receiptNumber', 'notes', 'student.name', 'student.email'])
    .sort('paidAt', 'desc')
    .paginate(1, 20);

  const prismaQuery = qb.build();

  const [transactions, totalCount] = await Promise.all([
    prisma.paymentTransaction.findMany({
      where: prismaQuery.where as Prisma.PaymentTransactionWhereInput,
      orderBy: prismaQuery.orderBy as Prisma.PaymentTransactionOrderByWithRelationInput,
      skip: prismaQuery.skip,
      take: prismaQuery.take,
      include: {
        student: { select: { id: true, name: true, email: true } },
        batch: { select: { id: true, name: true } },
        collectedBy: { select: { id: true, name: true } },
      },
    }),
    prisma.paymentTransaction.count({
      where: prismaQuery.where as Prisma.PaymentTransactionWhereInput,
    }),
  ]);

  const data = transactions.map((tx) => ({
    id: tx.id,
    studentId: tx.studentId,
    studentName: tx.student.name,
    studentEmail: tx.student.email,
    batchId: tx.batchId,
    batchName: tx.batch.name,
    monthlyFeeBillId: tx.monthlyFeeBillId,
    amount: Number(tx.amount),
    currency: tx.currency.toUpperCase(),
    paymentMethod: tx.paymentMethod,
    status: tx.status,
    receiptNumber: tx.receiptNumber,
    notes: tx.notes,
    paidAt: tx.paidAt,
    collectedByName: tx.collectedBy?.name || null,
  }));

  return {
    data,
    meta: qb.getPaginationMeta(totalCount),
  };
};
