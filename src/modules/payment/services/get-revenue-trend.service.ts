import { PaymentStatus } from '@prisma/client';
import { prisma } from '../../../config';
import { getBangladeshCurrentMonth, getBangladeshCurrentYear } from '../../../utils';
import type {
  IRevenueTrendMonthItem,
  IRevenueTrendQuery,
  IRevenueTrendResponse,
} from '../payment.interface';

const MONTH_LABELS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

/**
 * Calculates monthly billing target and payment transaction metrics for a given calendar month
 */
const fetchMonthTrendMetrics = async (
  month: number,
  year: number,
): Promise<IRevenueTrendMonthItem> => {
  const monthLabel = MONTH_LABELS_SHORT[month - 1] as string;
  const monthYear = `${monthLabel} ${year}`;

  const lastDay = new Date(year, month, 0).getDate();
  const startIso = `${year}-${String(month).padStart(2, '0')}-01T00:00:00.000+06:00`;
  const endIso = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}T23:59:59.999+06:00`;

  const [billAgg, txCount] = await Promise.all([
    prisma.monthlyFeeBill.aggregate({
      where: {
        billingMonth: month,
        billingYear: year,
        batch: { deletedAt: null },
        student: { deletedAt: null },
      },
      _sum: {
        monthlyFee: true,
        paidAmount: true,
        dueAmount: true,
      },
    }),
    prisma.paymentTransaction.count({
      where: {
        paidAt: {
          gte: new Date(startIso),
          lte: new Date(endIso),
        },
        status: PaymentStatus.COMPLETED,
        batch: { deletedAt: null },
        student: { deletedAt: null },
      },
    }),
  ]);

  const expectedRevenue = Number(billAgg._sum.monthlyFee || 0);
  const collectedAmount = Number(billAgg._sum.paidAmount || 0);
  const totalDue = Number(billAgg._sum.dueAmount || 0);
  const collectionRate =
    expectedRevenue > 0 ? Number(((collectedAmount / expectedRevenue) * 100).toFixed(2)) : 0;

  return {
    month,
    year,
    monthLabel,
    monthYear,
    expectedRevenue,
    collectedAmount,
    totalDue,
    collectionRate,
    transactionCount: txCount,
  };
};

/**
 * Retrieves month-by-month revenue and collection trend for the past N months (ascending)
 */
export const getRevenueTrend = async (
  query: IRevenueTrendQuery = {},
): Promise<IRevenueTrendResponse> => {
  const monthsCount = Math.min(Math.max(Number(query.months) || 6, 1), 12);
  const currentMonth = getBangladeshCurrentMonth();
  const currentYear = getBangladeshCurrentYear();

  // Generate ordered list of target months (oldest first -> current month last)
  const targetPeriods: Array<{ month: number; year: number }> = [];

  for (let i = monthsCount - 1; i >= 0; i--) {
    let m = currentMonth - i;
    let y = currentYear;
    while (m <= 0) {
      m += 12;
      y -= 1;
    }
    targetPeriods.push({ month: m, year: y });
  }

  const trend = await Promise.all(
    targetPeriods.map((period) => fetchMonthTrendMetrics(period.month, period.year)),
  );

  return {
    months: monthsCount,
    trend,
  };
};
