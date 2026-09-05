import { ExamStatus, Permission, ResultStatus, Role } from '@prisma/client';
import { prisma } from '../../../config';
import { ApiError, logger } from '../../../utils';
import type { IExamResponse } from '../exam.interface';
import { calculateExamStatistics, formatExamResponse } from '../exam.utils';

export const publishExamResultsService = async (
  examId: string,
  actorUserId: string,
  actorRole: Role,
): Promise<IExamResponse> => {
  // 1. Permission check for Teacher
  if (actorRole === Role.TEACHER) {
    const hasPerm = await prisma.teacherPermission.findUnique({
      where: {
        teacherId_permission: {
          teacherId: actorUserId,
          permission: Permission.MANAGE_EXAMS,
        },
      },
    });

    if (!hasPerm) {
      throw ApiError.forbidden('You lack the MANAGE_EXAMS permission required to publish results.');
    }
  }

  // 2. Verify exam exists
  const exam = await prisma.exam.findFirst({
    where: {
      id: examId,
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

  if (exam.results.length === 0) {
    throw ApiError.badRequest(
      'Cannot publish results for an exam with no marks entered. Please enter student marks first.',
    );
  }

  // 3. Update exam status and resultStatus
  const publishedExam = await prisma.exam.update({
    where: { id: examId },
    data: {
      resultStatus: ResultStatus.PUBLISHED,
      status: ExamStatus.COMPLETED,
    },
    include: {
      batch: true,
      results: true,
    },
  });

  const stats = calculateExamStatistics(
    publishedExam.results,
    Number(publishedExam.totalMarks),
    Number(publishedExam.passMarks),
  );

  logger.audit('EXAM_RESULTS_PUBLISHED', {
    examId,
    batchId: publishedExam.batchId,
    publishedBy: actorUserId,
    totalCandidates: stats.totalCandidates,
    passRate: stats.passRate,
  });

  return formatExamResponse(publishedExam, stats);
};
