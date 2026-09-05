import { EnrollmentStatus, ResultStatus, Role } from '@prisma/client';
import { prisma } from '../../../config';
import { ApiError } from '../../../utils';
import type { IExamResponse } from '../exam.interface';
import { calculateExamStatistics, formatExamResponse } from '../exam.utils';

export const getExamByIdService = async (
  id: string,
  actorUserId?: string,
  actorRole?: Role,
): Promise<IExamResponse> => {
  const exam = await prisma.exam.findFirst({
    where: {
      id,
      batch: {
        deletedAt: null,
      },
    },
    include: {
      batch: true,
      results: true,
    },
  });

  if (!exam) {
    throw ApiError.notFound('Exam not found');
  }

  // Student Enrollment Check
  if (actorRole === Role.STUDENT && actorUserId) {
    const isEnrolled = await prisma.enrollment.findFirst({
      where: {
        batchId: exam.batchId,
        studentId: actorUserId,
        status: EnrollmentStatus.ENROLLED,
      },
    });

    if (!isEnrolled) {
      throw ApiError.forbidden('You are not enrolled in the batch for this exam.');
    }
  }

  // Calculate stats if results are published or viewer is staff
  let stats = null;
  if (exam.resultStatus === ResultStatus.PUBLISHED || actorRole !== Role.STUDENT) {
    stats = calculateExamStatistics(exam.results, Number(exam.totalMarks), Number(exam.passMarks));
  }

  return formatExamResponse(exam, stats);
};
