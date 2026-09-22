import { prisma } from '../../../config';
import type { IMonthlyStatsQuery, IMonthlyStatsResponse } from '../payment.interface';
import { assertValidBillingPeriodNotFuture, ensureMonthlyBillsForPeriod } from '../payment.utils';

export const getMonthlyStats = async (
  query: IMonthlyStatsQuery,
): Promise<IMonthlyStatsResponse> => {
  const { targetMonth, targetYear, periodText } = assertValidBillingPeriodNotFuture(
    query.month,
    query.year,
  );

  // Sync / generate bill records for all enrolled students for accurate stats
  await ensureMonthlyBillsForPeriod(prisma, targetMonth, targetYear, query.batchId);

  const whereScope = {
    billingMonth: targetMonth,
    billingYear: targetYear,
    ...(query.batchId ? { batchId: query.batchId } : {}),
    batch: { deletedAt: null },
    student: { deletedAt: null },
  };

  const [aggregateSums, totalStudents, paidCount, partialCount, unpaidCount] = await Promise.all([
    prisma.monthlyFeeBill.aggregate({
      where: whereScope,
      _sum: {
        totalPayable: true,
        paidAmount: true,
        dueAmount: true,
      },
    }),
    prisma.monthlyFeeBill.count({ where: whereScope }),
    prisma.monthlyFeeBill.count({ where: { ...whereScope, status: 'PAID' } }),
    prisma.monthlyFeeBill.count({ where: { ...whereScope, status: 'PARTIAL' } }),
    prisma.monthlyFeeBill.count({ where: { ...whereScope, status: 'UNPAID' } }),
  ]);

  const expectedRevenue = Number(aggregateSums._sum.totalPayable || 0);
  const collectedAmount = Number(aggregateSums._sum.paidAmount || 0);
  const totalDue = Number(aggregateSums._sum.dueAmount || 0);
  const collectionRate =
    expectedRevenue > 0 ? Number(((collectedAmount / expectedRevenue) * 100).toFixed(1)) : 0;

  return {
    billingMonth: targetMonth,
    billingYear: targetYear,
    billingPeriodText: periodText,
    batchId: query.batchId || null,
    expectedRevenue,
    collectedAmount,
    totalDue,
    collectionRate,
    totalStudents,
    paidCount,
    partialCount,
    unpaidCount,
  };
};
