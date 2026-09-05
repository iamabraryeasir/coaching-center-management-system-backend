import type { Prisma } from '@prisma/client';
import { prisma } from '../../../config';
import { type IPaginationMeta, QueryBuilder } from '../../../utils';
import type { IRoutineQuery, IRoutineResponse } from '../routine.interface';
import { formatRoutineResponse } from '../routine.utils';

export const getAllRoutinesService = async (
  query: IRoutineQuery = {},
): Promise<{ meta: IPaginationMeta; data: IRoutineResponse[] }> => {
  const queryBuilder = new QueryBuilder(query as Record<string, unknown>)
    .search(['subject', 'room', 'teacher.name', 'batch.name'])
    .filter({ exclude: ['page', 'limit', 'sortBy', 'sortOrder', 'search'] })
    .where({
      batch: {
        deletedAt: null,
      },
    })
    .sort('startTime', 'asc')
    .paginate(1, 10, 100);

  const prismaQuery = queryBuilder.build();

  const [routines, total] = await Promise.all([
    prisma.classRoutine.findMany({
      where: prismaQuery.where as Prisma.ClassRoutineWhereInput,
      orderBy: prismaQuery.orderBy as Prisma.ClassRoutineOrderByWithRelationInput,
      skip: prismaQuery.skip,
      take: prismaQuery.take,
      include: {
        batch: true,
        teacher: {
          include: {
            teacherProfile: true,
          },
        },
      },
    }),
    prisma.classRoutine.count({
      where: prismaQuery.where as Prisma.ClassRoutineWhereInput,
    }),
  ]);

  const meta = queryBuilder.getPaginationMeta(total);
  const data = routines.map(formatRoutineResponse);

  return {
    meta,
    data,
  };
};
