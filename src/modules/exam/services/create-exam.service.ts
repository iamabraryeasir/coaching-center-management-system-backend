import { ExamStatus, Permission, ResultStatus, Role } from '@prisma/client';
import { prisma } from '../../../config';
import { ApiError, logger } from '../../../utils';
import type { ICreateExamInput, IExamResponse } from '../exam.interface';
import { formatExamResponse, normalizeExamDateToUtc } from '../exam.utils';

export const createExamService = async (
  input: ICreateExamInput,
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
      throw ApiError.forbidden('You lack the MANAGE_EXAMS permission required to create exams.');
    }
  }

  // 2. Verify batch exists and is not soft-deleted
  const batch = await prisma.batch.findFirst({
    where: {
      id: input.batchId,
      deletedAt: null,
    },
  });

  if (!batch) {
    throw ApiError.notFound('Batch not found');
  }

  // 3. Create exam record
  const examDate = normalizeExamDateToUtc(input.examDate);

  const exam = await prisma.exam.create({
    data: {
      batchId: input.batchId,
      title: input.title.trim(),
      description: input.description?.trim() ?? null,
      totalMarks: input.totalMarks,
      passMarks: input.passMarks,
      examDate,
      status: input.status ?? ExamStatus.UPCOMING,
      resultStatus: ResultStatus.DRAFT,
    },
    include: {
      batch: true,
    },
  });

  // 4. Audit Log
  logger.audit('EXAM_CREATED', {
    examId: exam.id,
    batchId: exam.batchId,
    title: exam.title,
    createdBy: actorUserId,
  });

  return formatExamResponse(exam);
};
