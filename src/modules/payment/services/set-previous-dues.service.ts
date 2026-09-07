import { prisma } from '../../../config';
import { ApiError, logger } from '../../../utils';
import type { ISetPreviousDuesInput } from '../payment.interface';
import { formatBillingPeriod } from '../payment.utils';

export const setPreviousDuesService = async (
  enrollmentId: string,
  input: ISetPreviousDuesInput,
  adminId: string,
) => {
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
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
          deletedAt: true,
        },
      },
    },
  });

  if (!enrollment || enrollment.batch.deletedAt) {
    throw ApiError.notFound('Enrollment not found or batch has been removed');
  }

  const updatedEnrollment = await prisma.enrollment.update({
    where: { id: enrollmentId },
    data: {
      ...(input.startBillingMonth !== undefined && {
        startBillingMonth: input.startBillingMonth,
      }),
      ...(input.startBillingYear !== undefined && {
        startBillingYear: input.startBillingYear,
      }),
      ...(input.openingDue !== undefined && {
        openingDue: input.openingDue,
      }),
      ...(input.discountAmount !== undefined && {
        discountAmount: input.discountAmount,
      }),
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
  });

  const rawFee = Number(updatedEnrollment.batch.fee);
  const discountAmount = Number(updatedEnrollment.discountAmount || 0);
  const effectiveMonthlyFee = Math.max(0, rawFee - discountAmount);

  logger.audit('ENROLLMENT_DUES_ADJUSTED', {
    enrollmentId,
    adminId,
    studentId: enrollment.student.id,
    batchId: enrollment.batch.id,
    startBillingMonth: updatedEnrollment.startBillingMonth,
    startBillingYear: updatedEnrollment.startBillingYear,
    openingDue: Number(updatedEnrollment.openingDue),
    discountAmount,
    effectiveMonthlyFee,
    notes: input.notes,
  });

  const startBillingPeriod =
    updatedEnrollment.startBillingMonth && updatedEnrollment.startBillingYear
      ? formatBillingPeriod(updatedEnrollment.startBillingMonth, updatedEnrollment.startBillingYear)
      : formatBillingPeriod(
          updatedEnrollment.enrolledAt.getMonth() + 1,
          updatedEnrollment.enrolledAt.getFullYear(),
        );

  return {
    id: updatedEnrollment.id,
    studentId: updatedEnrollment.studentId,
    batchId: updatedEnrollment.batchId,
    status: updatedEnrollment.status,
    enrolledAt: updatedEnrollment.enrolledAt,
    startBillingMonth: updatedEnrollment.startBillingMonth,
    startBillingYear: updatedEnrollment.startBillingYear,
    startBillingPeriod,
    openingDue: Number(updatedEnrollment.openingDue),
    monthlyFee: rawFee,
    discountAmount,
    effectiveMonthlyFee,
    student: updatedEnrollment.student,
    batch: updatedEnrollment.batch,
  };
};
