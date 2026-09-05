import { EnrollmentStatus, ResultStatus, Role } from '@prisma/client';
import { prisma } from '../../../config';
import { ApiError } from '../../../utils';
import type { IBatchExamResultsReportResponse } from '../exam.interface';
import {
  calculateExamStatistics,
  formatExamResponse,
  formatExamResultResponse,
} from '../exam.utils';

export const getExamResultsService = async (
  examId: string,
  actorUserId?: string,
  actorRole?: Role,
): Promise<IBatchExamResultsReportResponse> => {
  const exam = await prisma.exam.findFirst({
    where: {
      id: examId,
      batch: {
        deletedAt: null,
      },
    },
    include: {
      batch: true,
    },
  });

  if (!exam) {
    throw ApiError.notFound('Exam not found');
  }

  // Student Access Gate
  if (actorRole === Role.STUDENT) {
    if (exam.resultStatus !== ResultStatus.PUBLISHED) {
      throw ApiError.forbidden('Exam results have not been published yet.');
    }

    if (actorUserId) {
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
  }

  const totalMarksNum = Number(exam.totalMarks);
  const passMarksNum = Number(exam.passMarks);

  // Fetch results sorted by highest marks
  const results = await prisma.examResult.findMany({
    where: {
      examId,
      student: {
        deletedAt: null,
      },
    },
    orderBy: {
      marksObtained: 'desc',
    },
    include: {
      student: {
        include: {
          studentProfile: true,
        },
      },
    },
  });

  const stats = calculateExamStatistics(results, totalMarksNum, passMarksNum);

  const formattedResults = results.map((r, index) =>
    formatExamResultResponse(r, totalMarksNum, passMarksNum, index + 1),
  );

  return {
    exam: formatExamResponse(exam, stats),
    stats,
    results: formattedResults,
  };
};
