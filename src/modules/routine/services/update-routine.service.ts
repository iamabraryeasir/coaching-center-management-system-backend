import { Permission, type Prisma, Role, UserStatus } from '@prisma/client';
import { prisma } from '../../../config';
import { ApiError, logger } from '../../../utils';
import type { IRoutineResponse, IUpdateRoutineInput } from '../routine.interface';
import { formatRoutineResponse, validateRoutineScheduleConflicts } from '../routine.utils';

/**
 * Validates teacher permission for modifying routines
 */
const verifyTeacherRoutinePermission = async (
  actorUserId: string,
  actorRole: Role,
): Promise<void> => {
  if (actorRole !== Role.TEACHER) {
    return;
  }

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
      'You lack the MANAGE_ROUTINES permission required to update routines.',
    );
  }
};

/**
 * Verifies assigned teacher is valid and active
 */
const verifyTeacherActive = async (teacherId: string): Promise<void> => {
  const teacher = await prisma.user.findFirst({
    where: {
      id: teacherId,
      role: Role.TEACHER,
      deletedAt: null,
    },
  });

  if (!teacher) {
    throw ApiError.notFound('Assigned teacher not found');
  }

  if (teacher.status !== UserStatus.ACTIVE) {
    throw ApiError.badRequest('Assigned teacher account is not active.');
  }
};

/**
 * Constructs Prisma update data payload
 */
const buildRoutineUpdateData = (input: IUpdateRoutineInput): Prisma.ClassRoutineUpdateInput => {
  const updateData: Prisma.ClassRoutineUpdateInput = {};
  if (input.dayOfWeek !== undefined) {
    updateData.dayOfWeek = input.dayOfWeek;
  }
  if (input.startTime !== undefined) {
    updateData.startTime = input.startTime;
  }
  if (input.endTime !== undefined) {
    updateData.endTime = input.endTime;
  }
  if (input.subject !== undefined) {
    updateData.subject = input.subject;
  }
  if (input.room !== undefined) {
    updateData.room = input.room;
  }
  if (input.teacherId !== undefined) {
    updateData.teacher = input.teacherId
      ? { connect: { id: input.teacherId } }
      : { disconnect: true };
  }
  return updateData;
};

export const updateRoutineService = async (
  routineId: string,
  input: IUpdateRoutineInput,
  actorUserId: string,
  actorRole: Role,
): Promise<IRoutineResponse> => {
  // 1. Permission check for Teacher
  await verifyTeacherRoutinePermission(actorUserId, actorRole);

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

  // 3. Verify teacher if updated
  if (input.teacherId) {
    await verifyTeacherActive(input.teacherId);
  }

  // 4. Resolve effective scheduling parameters and validate conflicts
  const effectiveDay = input.dayOfWeek ?? existingRoutine.dayOfWeek;
  const effectiveStart = input.startTime ?? existingRoutine.startTime;
  const effectiveEnd = input.endTime ?? existingRoutine.endTime;
  const effectiveRoom = input.room !== undefined ? input.room : existingRoutine.room;
  const effectiveTeacherId =
    input.teacherId !== undefined ? input.teacherId : existingRoutine.teacherId;

  if (effectiveStart >= effectiveEnd) {
    throw ApiError.badRequest('Start time must be earlier than end time');
  }

  await validateRoutineScheduleConflicts({
    batchId: existingRoutine.batchId,
    dayOfWeek: effectiveDay,
    startTime: effectiveStart,
    endTime: effectiveEnd,
    room: effectiveRoom,
    teacherId: effectiveTeacherId,
    excludeRoutineId: routineId,
  });

  // 5. Update record
  const updateData = buildRoutineUpdateData(input);
  const updatedRoutine = await prisma.classRoutine.update({
    where: { id: routineId },
    data: updateData,
    include: {
      batch: true,
      teacher: {
        include: {
          teacherProfile: true,
        },
      },
    },
  });

  logger.audit('ROUTINE_UPDATED', {
    routineId,
    batchId: updatedRoutine.batchId,
    changes: input,
    updatedBy: actorUserId,
  });

  return formatRoutineResponse(updatedRoutine);
};
