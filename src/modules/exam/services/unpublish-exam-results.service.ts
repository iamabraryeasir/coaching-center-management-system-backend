import { ResultStatus, Role } from '@prisma/client';
import { prisma } from '../../../config';
import { ApiError, logger } from '../../../utils';
import type { IExamResponse } from '../exam.interface';
import { formatExamResponse } from '../exam.utils';

export const unpublishExamResultsService = async (
  examId: string,
  actorUserId: string,
  actorRole: Role,
): Promise<IExamResponse> => {
  if (actorRole !== Role.ADMIN) {
    throw ApiError.forbidden('Only an administrator can revert published exam results to draft.');
  }

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

  const unpublishedExam = await prisma.exam.update({
    where: { id: examId },
    data: {
      resultStatus: ResultStatus.DRAFT,
    },
    include: {
      batch: true,
    },
  });

  logger.audit('EXAM_RESULTS_UNPUBLISHED', {
    examId,
    batchId: unpublishedExam.batchId,
    unpublishedBy: actorUserId,
  });

  return formatExamResponse(unpublishedExam);
};
