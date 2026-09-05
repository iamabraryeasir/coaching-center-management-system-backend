import { prisma } from '../../../config';
import { QueryBuilder } from '../../../utils';

export const getAllPaymentsService = async (query: Record<string, unknown>) => {
  const queryBuilder = new QueryBuilder(query)
    .search(['student.name', 'student.email', 'batch.name', 'receipt.receiptNumber'])
    .filter({
      exclude: ['searchTerm', 'page', 'limit', 'sortBy', 'sortOrder'],
    })
    .sort('createdAt', 'desc')
    .paginate(1, 10, 100);

  const prismaQuery = queryBuilder.build();

  const [transactions, totalCount] = await Promise.all([
    prisma.paymentTransaction.findMany({
      ...prismaQuery,
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
      student: t.student,
      batch: t.batch,
      receipt: t.receipt,
    })),
  };
};
