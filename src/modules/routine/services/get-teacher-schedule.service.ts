import { Role } from '@prisma/client';
import { prisma } from '../../../config';
import { ApiError } from '../../../utils';
import type { ITeacherScheduleResponse } from '../routine.interface';
import { formatRoutineResponse, groupRoutinesByDay } from '../routine.utils';

export const getTeacherScheduleService = async (
  teacherId: string,
): Promise<ITeacherScheduleResponse> => {
  const teacher = await prisma.user.findFirst({
    where: {
      id: teacherId,
      role: Role.TEACHER,
      deletedAt: null,
    },
    include: {
      teacherProfile: true,
    },
  });

  if (!teacher) {
    throw ApiError.notFound('Teacher not found');
  }

  const routines = await prisma.classRoutine.findMany({
    where: {
      teacherId,
      batch: {
        deletedAt: null,
      },
    },
    include: {
      batch: true,
      teacher: {
        include: {
          teacherProfile: true,
        },
      },
    },
    orderBy: [{ startTime: 'asc' }],
  });

  const formattedRoutines = routines.map(formatRoutineResponse);
  const schedule = groupRoutinesByDay(formattedRoutines);

  return {
    teacher: {
      id: teacher.id,
      name: teacher.name,
      email: teacher.email,
      phone: teacher.phone,
      designation: teacher.teacherProfile?.designation ?? null,
      specialization: teacher.teacherProfile?.specialization ?? null,
    },
    totalSlots: routines.length,
    schedule,
  };
};
