import { BatchStatus, EnrollmentStatus } from '@prisma/client';
import { prisma } from '../../../config';
import { ApiError, logger } from '../../../utils';
import type { IEnrollmentResponse } from '../batch.interface';
import { formatEnrollmentResponse } from '../batch.utils';

export const studentEnrollService = async (
  batchId: string,
  studentUserId: string,
): Promise<IEnrollmentResponse> => {
  // 1. Verify batch availability
  const batch = await prisma.batch.findFirst({
    where: {
      id: batchId,
      deletedAt: null,
    },
  });

  if (!batch) {
    throw ApiError.notFound('Batch not found');
  }

  if (batch.status === BatchStatus.COMPLETED || batch.status === BatchStatus.CANCELLED) {
    throw ApiError.badRequest(`Cannot enroll in a batch with status '${batch.status}'`);
  }

  // 2. Concurrency-safe enrollment inside interactive transaction
  const enrollment = await prisma.$transaction(async (tx) => {
    const existing = await tx.enrollment.findUnique({
      where: {
        batchId_studentId: {
          batchId,
          studentId: studentUserId,
        },
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

    if (existing) {
      if (existing.status === EnrollmentStatus.ENROLLED) {
        throw ApiError.conflict('You are already enrolled in this batch.');
      }
      if (existing.status === EnrollmentStatus.PENDING) {
        throw ApiError.conflict('You already have a pending enrollment request for this batch.');
      }

      // If previously rejected, re-open request
      return tx.enrollment.update({
        where: { id: existing.id },
        data: {
          status: EnrollmentStatus.PENDING,
          enrolledAt: new Date(),
          approvedAt: null,
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
    }

    // Create fresh pending enrollment
    return tx.enrollment.create({
      data: {
        batchId,
        studentId: studentUserId,
        status: EnrollmentStatus.PENDING,
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
  });

  logger.audit('ENROLLMENT_REQUESTED', {
    enrollmentId: enrollment.id,
    studentId: studentUserId,
    batchId,
  });

  return formatEnrollmentResponse(enrollment);
};
