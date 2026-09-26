import {
  BatchStatus,
  EnrollmentStatus,
  ExamStatus,
  PaymentBillStatus,
  ResultStatus,
} from '@prisma/client';
import { prisma } from '../../../config';
import { normalizeDateToUtc } from '../../../utils';
import {
  assertValidBillingPeriodNotFuture,
  ensureMonthlyBillsForPeriod,
} from '../../payment/payment.utils';
import type { IMonthlySummaryQuery, IMonthlySummaryResponse } from '../dashboard.interface';

/**
 * Aggregates complete financial, academic, and batch health snapshot for a calendar month.
 */
export const getMonthlySummary = async (
  query: IMonthlySummaryQuery = {},
): Promise<IMonthlySummaryResponse> => {
  const { targetMonth, targetYear, periodText } = assertValidBillingPeriodNotFuture(
    query.month,
    query.year,
  );

  // Sync / generate bill records for all enrolled students in the period
  await ensureMonthlyBillsForPeriod(prisma, targetMonth, targetYear);

  // Calculate calendar month date boundaries
  const lastDay = new Date(targetYear, targetMonth, 0).getDate();
  const monthStartCalendar = normalizeDateToUtc(
    `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`,
  );
  const monthEndCalendar = normalizeDateToUtc(
    `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
  );

  const monthStartIso = new Date(
    `${targetYear}-${String(targetMonth).padStart(2, '0')}-01T00:00:00.000+06:00`,
  );
  const monthEndIso = new Date(
    `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}T23:59:59.999+06:00`,
  );

  const [
    financialAgg,
    paidCount,
    partialCount,
    unpaidCount,
    totalExams,
    publishedResults,
    upcomingExams,
    completedExams,
    ongoingBatches,
    upcomingBatches,
    totalEnrollmentsThisMonth,
  ] = await Promise.all([
    // 1. Financial totals
    prisma.monthlyFeeBill.aggregate({
      where: {
        billingMonth: targetMonth,
        billingYear: targetYear,
        batch: { deletedAt: null },
        student: { deletedAt: null },
      },
      _sum: {
        monthlyFee: true,
        paidAmount: true,
        dueAmount: true,
      },
    }),

    // 2. Paid bills count
    prisma.monthlyFeeBill.count({
      where: {
        billingMonth: targetMonth,
        billingYear: targetYear,
        status: PaymentBillStatus.PAID,
        batch: { deletedAt: null },
        student: { deletedAt: null },
      },
    }),

    // 3. Partial bills count
    prisma.monthlyFeeBill.count({
      where: {
        billingMonth: targetMonth,
        billingYear: targetYear,
        status: PaymentBillStatus.PARTIAL,
        batch: { deletedAt: null },
        student: { deletedAt: null },
      },
    }),

    // 4. Unpaid bills count
    prisma.monthlyFeeBill.count({
      where: {
        billingMonth: targetMonth,
        billingYear: targetYear,
        status: PaymentBillStatus.UNPAID,
        batch: { deletedAt: null },
        student: { deletedAt: null },
      },
    }),

    // 5. Total exams scheduled in this month
    prisma.exam.count({
      where: {
        examDate: { gte: monthStartCalendar, lte: monthEndCalendar },
        batch: { deletedAt: null },
      },
    }),

    // 6. Published exam results
    prisma.exam.count({
      where: {
        examDate: { gte: monthStartCalendar, lte: monthEndCalendar },
        resultStatus: ResultStatus.PUBLISHED,
        batch: { deletedAt: null },
      },
    }),

    // 7. Upcoming exams
    prisma.exam.count({
      where: {
        examDate: { gte: monthStartCalendar, lte: monthEndCalendar },
        status: ExamStatus.UPCOMING,
        batch: { deletedAt: null },
      },
    }),

    // 8. Completed exams
    prisma.exam.count({
      where: {
        examDate: { gte: monthStartCalendar, lte: monthEndCalendar },
        status: ExamStatus.COMPLETED,
        batch: { deletedAt: null },
      },
    }),

    // 9. Ongoing batches
    prisma.batch.count({
      where: {
        status: BatchStatus.ONGOING,
        deletedAt: null,
      },
    }),

    // 10. Upcoming batches
    prisma.batch.count({
      where: {
        status: BatchStatus.UPCOMING,
        deletedAt: null,
      },
    }),

    // 11. New enrolled students in this calendar month
    prisma.enrollment.count({
      where: {
        createdAt: { gte: monthStartIso, lte: monthEndIso },
        status: EnrollmentStatus.ENROLLED,
        batch: { deletedAt: null },
        student: { deletedAt: null },
      },
    }),
  ]);

  const expectedRevenue = Number(financialAgg._sum.monthlyFee || 0);
  const collectedAmount = Number(financialAgg._sum.paidAmount || 0);
  const totalDue = Number(financialAgg._sum.dueAmount || 0);
  const collectionRate =
    expectedRevenue > 0 ? Number(((collectedAmount / expectedRevenue) * 100).toFixed(2)) : 0;

  return {
    month: targetMonth,
    year: targetYear,
    billingPeriodText: periodText,
    financial: {
      expectedRevenue,
      collectedAmount,
      totalDue,
      collectionRate,
      paidCount,
      partialCount,
      unpaidCount,
      currency: 'BDT',
    },
    academic: {
      totalExams,
      publishedResults,
      upcomingExams,
      completedExams,
    },
    batches: {
      ongoingBatches,
      upcomingBatches,
      totalEnrollmentsThisMonth,
    },
  };
};
