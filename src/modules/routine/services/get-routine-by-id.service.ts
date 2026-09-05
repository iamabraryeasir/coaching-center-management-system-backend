import { prisma } from '../../../config';
import { ApiError } from '../../../utils';
import type { IRoutineResponse } from '../routine.interface';
import { formatRoutineResponse } from '../routine.utils';

export const getRoutineByIdService = async (routineId: string): Promise<IRoutineResponse> => {
  const routine = await prisma.classRoutine.findFirst({
    where: {
      id: routineId,
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
  });

  if (!routine) {
    throw ApiError.notFound('Class routine slot not found');
  }

  return formatRoutineResponse(routine);
};
