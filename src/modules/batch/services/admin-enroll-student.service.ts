import { EnrollmentStatus, Role, UserStatus } from '@prisma/client';
import { prisma } from '../../../config';
import { ApiError, logger } from '../../../utils';
import type { IEnrollmentResponse } from '../batch.interface';
import { formatEnrollmentResponse } from '../batch.utils';

export const adminEnrollStudentService = async (
  batchId: string,
  studentId: string,
  adminUserId: string,
): Promise<IEnrollmentResponse> => {
  // 1. Verify batch
  const batch = await prisma.batch.findFirst({
    where: {
      id: batchId,
      deletedAt: null,
    },
  });

  if (!batch) {
    throw ApiError.notFound('Batch not found');
  }

  // 2. Verify student exists and is active
  const student = await prisma.user.findFirst({
    where: {
      id: studentId,
      role: Role.STUDENT,
      deletedAt: null,
    },
    include: {
      studentProfile: true,
    },
  });

  if (!student) {
    throw ApiError.notFound('Student not found');
  }

  if (student.status !== UserStatus.ACTIVE) {
    throw ApiError.badRequest(
      `Cannot enroll student with status '${student.status}'. Student must be ACTIVE.`,
    );
  }

  // 3. Upsert enrollment in transaction
  const enrollment = await prisma.$transaction(async (tx) => {
    const existing = await tx.enrollment.findUnique({
      where: {
        batchId_studentId: {
          batchId,
          studentId,
        },
      },
    });

    if (existing) {
      if (existing.status === EnrollmentStatus.ENROLLED) {
        throw ApiError.conflict('Student is already enrolled in this batch.');
      }

      return tx.enrollment.update({
        where: { id: existing.id },
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
    }

    return tx.enrollment.create({
      data: {
        batchId,
        studentId,
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
  });

  logger.audit('STUDENT_ENROLLED_BY_ADMIN', {
    enrollmentId: enrollment.id,
    studentId,
    batchId,
    enrolledBy: adminUserId,
  });

  return formatEnrollmentResponse(enrollment);
};
