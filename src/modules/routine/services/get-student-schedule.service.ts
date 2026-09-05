import { EnrollmentStatus } from '@prisma/client';
import { prisma } from '../../../config';
import type { IStudentScheduleResponse } from '../routine.interface';
import { formatRoutineResponse, groupRoutinesByDay } from '../routine.utils';

export const getStudentScheduleService = async (
  studentUserId: string,
): Promise<IStudentScheduleResponse> => {
  // 1. Fetch student's active batch enrollments
  const enrollments = await prisma.enrollment.findMany({
    where: {
      studentId: studentUserId,
      status: EnrollmentStatus.ENROLLED,
      batch: {
        deletedAt: null,
      },
    },
    select: {
      batchId: true,
    },
  });

  const batchIds = enrollments.map((e) => e.batchId);

  if (batchIds.length === 0) {
    return {
      studentId: studentUserId,
      totalSlots: 0,
      enrolledBatchesCount: 0,
      schedule: groupRoutinesByDay([]),
    };
  }

  // 2. Fetch routines for all enrolled batches
  const routines = await prisma.classRoutine.findMany({
    where: {
      batchId: {
        in: batchIds,
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
    studentId: studentUserId,
    totalSlots: routines.length,
    enrolledBatchesCount: batchIds.length,
    schedule,
  };
};
