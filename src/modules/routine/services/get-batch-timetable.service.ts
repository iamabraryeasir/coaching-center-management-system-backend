import { prisma } from '../../../config';
import { ApiError } from '../../../utils';
import type { ITimetableResponse } from '../routine.interface';
import { formatRoutineResponse, groupRoutinesByDay } from '../routine.utils';

export const getBatchTimetableService = async (batchId: string): Promise<ITimetableResponse> => {
  const batch = await prisma.batch.findFirst({
    where: {
      id: batchId,
      deletedAt: null,
    },
  });

  if (!batch) {
    throw ApiError.notFound('Batch not found');
  }

  const routines = await prisma.classRoutine.findMany({
    where: {
      batchId,
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
    batch: {
      id: batch.id,
      name: batch.name,
      fee: Number(batch.fee),
    },
    totalSlots: routines.length,
    schedule,
  };
};
