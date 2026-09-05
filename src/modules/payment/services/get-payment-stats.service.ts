import { PaymentStatus } from '@prisma/client';
import { format } from 'date-fns';
import { prisma } from '../../../config';
import type { IMonthlyRevenue, IPaymentMethodBreakdown, IPaymentStats } from '../payment.interface';

export const getPaymentStatsService = async (): Promise<IPaymentStats> => {
  // 1. Total revenue and aggregate transaction counts
  const [
    totalRevenueAgg,
    totalTransactions,
    completedTransactions,
    pendingTransactions,
    failedTransactions,
    methodGrouped,
    completedPayments,
  ] = await Promise.all([
    prisma.paymentTransaction.aggregate({
      where: { status: PaymentStatus.COMPLETED },
      _sum: { amount: true },
    }),
    prisma.paymentTransaction.count(),
    prisma.paymentTransaction.count({ where: { status: PaymentStatus.COMPLETED } }),
    prisma.paymentTransaction.count({ where: { status: PaymentStatus.PENDING } }),
    prisma.paymentTransaction.count({ where: { status: PaymentStatus.FAILED } }),
    prisma.paymentTransaction.groupBy({
      by: ['paymentMethod'],
      where: { status: PaymentStatus.COMPLETED },
      _count: { id: true },
      _sum: { amount: true },
    }),
    prisma.paymentTransaction.findMany({
      where: { status: PaymentStatus.COMPLETED },
      select: {
        amount: true,
        paidAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  // 2. Build method breakdown
  const methodBreakdown: IPaymentMethodBreakdown[] = methodGrouped.map((item) => ({
    method: item.paymentMethod,
    count: item._count.id,
    totalAmount: Number(item._sum.amount || 0),
  }));

  // 3. Group completed revenue by Month (YYYY-MM) using date-fns
  const monthlyMap = new Map<string, { revenue: number; count: number }>();

  for (const payment of completedPayments) {
    const dateToUse = payment.paidAt || payment.createdAt;
    const monthKey = format(dateToUse, 'yyyy-MM');
    const existing = monthlyMap.get(monthKey) || { revenue: 0, count: 0 };
    existing.revenue += Number(payment.amount);
    existing.count += 1;
    monthlyMap.set(monthKey, existing);
  }

  const monthlyRevenue: IMonthlyRevenue[] = Array.from(monthlyMap.entries()).map(
    ([month, data]) => ({
      month,
      revenue: Math.round(data.revenue * 100) / 100,
      transactionCount: data.count,
    }),
  );

  return {
    totalRevenue: Number(totalRevenueAgg._sum.amount || 0),
    totalTransactions,
    completedTransactions,
    pendingTransactions,
    failedTransactions,
    methodBreakdown,
    monthlyRevenue,
  };
};
