import { Permission, ResultStatus, Role } from '@prisma/client';
import { prisma } from '../../../config';
import { ApiError, logger } from '../../../utils';
import type { IExamResponse, IUpdateExamInput } from '../exam.interface';
import { formatExamResponse, normalizeExamDateToUtc } from '../exam.utils';

export const updateExamService = async (
  id: string,
  input: IUpdateExamInput,
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
      throw ApiError.forbidden('You lack the MANAGE_EXAMS permission required to update exams.');
    }
  }

  // 2. Verify exam exists
  const existingExam = await prisma.exam.findFirst({
    where: {
      id,
      batch: {
        deletedAt: null,
      },
    },
    include: {
      batch: true,
    },
  });

  if (!existingExam) {
    throw ApiError.notFound('Exam not found');
  }

  // Prevent modifying total marks if results are already published
  if (
    existingExam.resultStatus === ResultStatus.PUBLISHED &&
    (input.totalMarks !== undefined || input.passMarks !== undefined)
  ) {
    throw ApiError.badRequest(
      'Cannot modify total marks or pass marks for an exam with published results. Unpublish results first.',
    );
  }

  // 3. Prepare update data
  const updateData: Record<string, unknown> = {};
  if (input.title !== undefined) {
    updateData.title = input.title.trim();
  }
  if (input.description !== undefined) {
    updateData.description = input.description.trim();
  }
  if (input.totalMarks !== undefined) {
    updateData.totalMarks = input.totalMarks;
  }
  if (input.passMarks !== undefined) {
    updateData.passMarks = input.passMarks;
  }
  if (input.status !== undefined) {
    updateData.status = input.status;
  }
  if (input.examDate !== undefined) {
    updateData.examDate = normalizeExamDateToUtc(input.examDate);
  }

  const updatedExam = await prisma.exam.update({
    where: { id },
    data: updateData,
    include: {
      batch: true,
    },
  });

  logger.audit('EXAM_UPDATED', {
    examId: id,
    batchId: updatedExam.batchId,
    updatedBy: actorUserId,
    changes: Object.keys(input),
  });

  return formatExamResponse(updatedExam);
};
