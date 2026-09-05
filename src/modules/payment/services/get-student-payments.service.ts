import { prisma } from '../../../config';
import { QueryBuilder } from '../../../utils';

export const getStudentPaymentsService = async (
  studentId: string,
  query: Record<string, unknown>,
) => {
  const queryBuilder = new QueryBuilder(query)
    .where({
      studentId,
    })
    .search(['batch.name', 'receipt.receiptNumber'])
    .filter({
      exclude: ['searchTerm', 'page', 'limit', 'sortBy', 'sortOrder'],
    })
    .sort('createdAt', 'desc')
    .paginate(1, 10, 50);

  const prismaQuery = queryBuilder.build();

  const [transactions, totalCount] = await Promise.all([
    prisma.paymentTransaction.findMany({
      ...prismaQuery,
      include: {
        batch: {
          select: {
            id: true,
            name: true,
            fee: true,
          },
        },
        receipt: {
          select: {
            id: true,
            receiptNumber: true,
            issuedAt: true,
            downloadUrl: true,
          },
        },
      },
    }),
    prisma.paymentTransaction.count({ where: prismaQuery.where }),
  ]);

  return {
    meta: queryBuilder.getPaginationMeta(totalCount),
    data: transactions.map((t) => ({
      id: t.id,
      amount: Number(t.amount),
      currency: t.currency,
      paymentMethod: t.paymentMethod,
      status: t.status,
      paidAt: t.paidAt,
      createdAt: t.createdAt,
      batch: t.batch,
      receipt: t.receipt,
    })),
  };
};
