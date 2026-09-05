import { Permission, Role } from '@prisma/client';
import { prisma } from '../../../config';
import { ApiError, logger } from '../../../utils';

export const deleteRoutineService = async (
  routineId: string,
  actorUserId: string,
  actorRole: Role,
): Promise<{ message: string; routineId: string }> => {
  // 1. Permission check for Teacher
  if (actorRole === Role.TEACHER) {
    const hasPerm = await prisma.teacherPermission.findUnique({
      where: {
        teacherId_permission: {
          teacherId: actorUserId,
          permission: Permission.MANAGE_ROUTINES,
        },
      },
    });

    if (!hasPerm) {
      throw ApiError.forbidden(
        'You lack the MANAGE_ROUTINES permission required to delete routines.',
      );
    }
  }

  // 2. Verify routine exists
  const existingRoutine = await prisma.classRoutine.findFirst({
    where: {
      id: routineId,
      batch: {
        deletedAt: null,
      },
    },
    include: {
      batch: true,
    },
  });

  if (!existingRoutine) {
    throw ApiError.notFound('Class routine slot not found');
  }

  // 3. Delete routine slot
  await prisma.classRoutine.delete({
    where: { id: routineId },
  });

  logger.audit('ROUTINE_DELETED', {
    routineId,
    batchId: existingRoutine.batchId,
    dayOfWeek: existingRoutine.dayOfWeek,
    time: `${existingRoutine.startTime} - ${existingRoutine.endTime}`,
    deletedBy: actorUserId,
  });

  return {
    message: 'Class routine slot deleted successfully',
    routineId,
  };
};
