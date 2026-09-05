import { Permission, Role, UserStatus } from '@prisma/client';
import { prisma } from '../../../config';
import { ApiError, logger } from '../../../utils';
import type { ICreateRoutineInput, IRoutineResponse } from '../routine.interface';
import { formatRoutineResponse, validateRoutineScheduleConflicts } from '../routine.utils';

export const createRoutineService = async (
  input: ICreateRoutineInput,
  actorUserId: string,
  actorRole: Role,
): Promise<IRoutineResponse> => {
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
        'You lack the MANAGE_ROUTINES permission required to create routines.',
      );
    }
  }

  // 2. Verify target batch exists
  const batch = await prisma.batch.findFirst({
    where: {
      id: input.batchId,
      deletedAt: null,
    },
  });

  if (!batch) {
    throw ApiError.notFound('Batch not found');
  }

  // 3. Verify teacher exists and is active if provided
  if (input.teacherId) {
    const teacher = await prisma.user.findFirst({
      where: {
        id: input.teacherId,
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
  }

  // 4. Validate schedule conflicts (Batch overlap, Teacher overlap, Room overlap)
  await validateRoutineScheduleConflicts({
    batchId: input.batchId,
    dayOfWeek: input.dayOfWeek,
    startTime: input.startTime,
    endTime: input.endTime,
    room: input.room,
    teacherId: input.teacherId,
  });

  // 5. Create Routine
  const routine = await prisma.classRoutine.create({
    data: {
      batchId: input.batchId,
      dayOfWeek: input.dayOfWeek,
      startTime: input.startTime,
      endTime: input.endTime,
      subject: input.subject || null,
      room: input.room || null,
      teacherId: input.teacherId || null,
    },
    include: {
      batch: true,
      teacher: {
        include: {
          teacherProfile: true,
        },
      },
    },
  });

  logger.audit('ROUTINE_CREATED', {
    routineId: routine.id,
    batchId: routine.batchId,
    dayOfWeek: routine.dayOfWeek,
    time: `${routine.startTime} - ${routine.endTime}`,
    subject: routine.subject,
    room: routine.room,
    teacherId: routine.teacherId,
    createdBy: actorUserId,
  });

  return formatRoutineResponse(routine);
};
