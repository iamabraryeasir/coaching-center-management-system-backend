import { EnrollmentStatus } from '@prisma/client';
import { prisma } from '../../../config';
import { ApiError, logger } from '../../../utils';
import type { IEnrollmentResponse } from '../batch.interface';
import { formatEnrollmentResponse } from '../batch.utils';

export const rejectEnrollmentService = async (
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

  if (enrollment.status === EnrollmentStatus.REJECTED) {
    throw ApiError.badRequest('This enrollment has already been rejected.');
  }

  const updatedEnrollment = await prisma.enrollment.update({
    where: { id: enrollmentId },
    data: {
      status: EnrollmentStatus.REJECTED,
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

  logger.audit('ENROLLMENT_REJECTED', {
    enrollmentId,
    batchId: updatedEnrollment.batchId,
    studentId: updatedEnrollment.studentId,
    rejectedBy: adminUserId,
  });

  return formatEnrollmentResponse(updatedEnrollment);
};
