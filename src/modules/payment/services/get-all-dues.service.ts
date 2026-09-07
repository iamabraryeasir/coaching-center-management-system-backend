import { EnrollmentStatus, PaymentStatus } from '@prisma/client';
import { prisma } from '../../../config';
import type { IAdminDefaulterItem, IAdminDuesResponse } from '../payment.interface';
import { calculateUnpaidPeriods } from '../payment.utils';

export const getAllDuesService = async (query: {
  batchId?: string;
  studentId?: string;
}): Promise<IAdminDuesResponse> => {
  const enrollments = await prisma.enrollment.findMany({
    where: {
      status: EnrollmentStatus.ENROLLED,
      ...(query.batchId && { batchId: query.batchId }),
      ...(query.studentId && { studentId: query.studentId }),
      batch: {
        deletedAt: null,
      },
      student: {
        deletedAt: null,
      },
    },
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
    orderBy: {
      enrolledAt: 'desc',
    },
  });

  const defaulters: IAdminDefaulterItem[] = [];
  let totalOutstandingAmount = 0;

  for (const enrollment of enrollments) {
    const rawFee = Number(enrollment.batch.fee);
    const discountAmount = Number(enrollment.discountAmount || 0);
    const effectiveMonthlyFee = Math.max(0, rawFee - discountAmount);
    const openingDue = Number(enrollment.openingDue || 0);

    const startMonth = enrollment.startBillingMonth || enrollment.enrolledAt.getMonth() + 1;
    const startYear = enrollment.startBillingYear || enrollment.enrolledAt.getFullYear();

    const completedPayments = await prisma.paymentTransaction.findMany({
      where: {
        studentId: enrollment.studentId,
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

    const { unpaidPeriodStrings } = calculateUnpaidPeriods(startMonth, startYear, paidKeySet);

    const totalUnpaidMonthlyFee = unpaidPeriodStrings.length * effectiveMonthlyFee;
    const totalDueForEnrollment = totalUnpaidMonthlyFee + openingDue;

    if (totalDueForEnrollment > 0) {
      totalOutstandingAmount += totalDueForEnrollment;
      defaulters.push({
        studentId: enrollment.student.id,
        studentName: enrollment.student.name,
        studentEmail: enrollment.student.email,
        studentPhone: enrollment.student.phone || '',
        batchId: enrollment.batch.id,
        batchName: enrollment.batch.name,
        monthlyFee: rawFee,
        discountAmount,
        effectiveMonthlyFee,
        unpaidMonthsCount: unpaidPeriodStrings.length,
        unpaidMonths: unpaidPeriodStrings,
        openingDue,
        totalOutstandingDue: totalDueForEnrollment,
      });
    }
  }

  return {
    totalDefaulters: defaulters.length,
    totalOutstandingAmount,
    defaulters,
  };
};
