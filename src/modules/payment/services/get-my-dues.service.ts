import { EnrollmentStatus, PaymentStatus } from '@prisma/client';
import { prisma } from '../../../config';
import { ApiError } from '../../../utils';
import type { IStudentBatchDueSummary, IStudentDuesResponse } from '../payment.interface';
import { calculateUnpaidPeriods, formatBillingPeriod } from '../payment.utils';

export const getMyDuesService = async (studentId: string): Promise<IStudentDuesResponse> => {
  const student = await prisma.user.findFirst({
    where: {
      id: studentId,
      deletedAt: null,
    },
  });

  if (!student) {
    throw ApiError.notFound('Student not found');
  }

  const enrollments = await prisma.enrollment.findMany({
    where: {
      studentId,
      status: EnrollmentStatus.ENROLLED,
      batch: {
        deletedAt: null,
      },
    },
    include: {
      batch: {
        select: {
          id: true,
          name: true,
          fee: true,
        },
      },
    },
  });

  const batchSummaries: IStudentBatchDueSummary[] = [];
  let grandOpeningDue = 0;
  let grandMonthlyDue = 0;

  for (const enrollment of enrollments) {
    const rawFee = Number(enrollment.batch.fee);
    const discountAmount = Number(enrollment.discountAmount || 0);
    const effectiveMonthlyFee = Math.max(0, rawFee - discountAmount);
    const openingDue = Number(enrollment.openingDue || 0);

    const startMonth = enrollment.startBillingMonth || enrollment.enrolledAt.getMonth() + 1;
    const startYear = enrollment.startBillingYear || enrollment.enrolledAt.getFullYear();
    const startBillingPeriod = formatBillingPeriod(startMonth, startYear);

    const completedPayments = await prisma.paymentTransaction.findMany({
      where: {
        studentId,
        batchId: enrollment.batchId,
        status: PaymentStatus.COMPLETED,
      },
      select: {
        billingMonth: true,
        billingYear: true,
      },
    });

    const paidKeySet = new Set(
      completedPayments.map((p) => `${p.billingYear}-${String(p.billingMonth).padStart(2, '0')}`),
    );

    const { unpaidMonths } = calculateUnpaidPeriods(startMonth, startYear, paidKeySet);
    const items = unpaidMonths.map((u) => ({ ...u, amount: effectiveMonthlyFee }));

    const totalUnpaidMonthlyFee = items.length * effectiveMonthlyFee;
    const totalDueForBatch = totalUnpaidMonthlyFee + openingDue;

    grandOpeningDue += openingDue;
    grandMonthlyDue += totalUnpaidMonthlyFee;

    batchSummaries.push({
      batchId: enrollment.batch.id,
      batchName: enrollment.batch.name,
      monthlyFee: rawFee,
      discountAmount,
      effectiveMonthlyFee,
      enrolledAt: enrollment.enrolledAt,
      startBillingPeriod,
      unpaidMonths: items,
      totalUnpaidMonthlyFee,
      openingDue,
      totalDueForBatch,
    });
  }

  return {
    studentId: student.id,
    studentName: student.name,
    totalOpeningDue: grandOpeningDue,
    totalMonthlyDue: grandMonthlyDue,
    totalOutstandingDue: grandOpeningDue + grandMonthlyDue,
    batches: batchSummaries,
  };
};
