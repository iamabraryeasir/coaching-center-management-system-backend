import { EnrollmentStatus } from '@prisma/client';
import { prisma } from '../../../config';
import { ApiError, logger } from '../../../utils';
import type { IEnrollmentResponse } from '../batch.interface';
import { formatEnrollmentResponse } from '../batch.utils';

export const approveEnrollmentService = async (
  enrollmentId: string,
  adminUserId: string,
): Promise<IEnrollmentResponse> => {
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      student: {
        include: {
          studentProfile: true,
        },
      },
      batch: true,
    },
  });

  if (!enrollment) {
    throw ApiError.notFound('Enrollment record not found');
  }

  if (enrollment.status === EnrollmentStatus.ENROLLED) {
    throw ApiError.badRequest('This enrollment has already been approved.');
  }

  if (enrollment.batch?.deletedAt) {
    throw ApiError.badRequest('Cannot approve enrollment for a deleted batch.');
  }

  const updatedEnrollment = await prisma.enrollment.update({
    where: { id: enrollmentId },
    data: {
      status: EnrollmentStatus.ENROLLED,
      approvedAt: new Date(),
    },
    include: {
      student: {
        include: {
          studentProfile: true,
        },
      },
      batch: true,
    },
  });

  logger.audit('ENROLLMENT_APPROVED', {
    enrollmentId,
    batchId: updatedEnrollment.batchId,
    studentId: updatedEnrollment.studentId,
    approvedBy: adminUserId,
  });

  return formatEnrollmentResponse(updatedEnrollment);
};
