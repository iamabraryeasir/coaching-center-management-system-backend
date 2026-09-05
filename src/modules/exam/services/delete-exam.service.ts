import { Permission, Role } from '@prisma/client';
import { prisma } from '../../../config';
import { ApiError, logger } from '../../../utils';

export const deleteExamService = async (
  id: string,
  actorUserId: string,
  actorRole: Role,
): Promise<{ id: string; message: string }> => {
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
      throw ApiError.forbidden('You lack the MANAGE_EXAMS permission required to delete exams.');
    }
  }

  // 2. Verify exam exists
  const exam = await prisma.exam.findFirst({
    where: {
      id,
    },
  });

  if (!exam) {
    throw ApiError.notFound('Exam not found');
  }

  // 3. Delete exam record (cascade deletes exam_results)
  await prisma.exam.delete({
    where: { id },
  });

  logger.audit('EXAM_DELETED', {
    examId: id,
    batchId: exam.batchId,
    title: exam.title,
    deletedBy: actorUserId,
  });

  return {
    id,
    message: 'Exam and all associated marks deleted successfully',
  };
};
