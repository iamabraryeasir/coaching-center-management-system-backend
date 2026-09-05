import { EnrollmentStatus, type Prisma } from '@prisma/client';
import { prisma } from '../../../config';
import { type IPaginationMeta, QueryBuilder } from '../../../utils';
import type { IBatchQuery, IBatchResponse } from '../batch.interface';
import { formatBatchResponse } from '../batch.utils';

export const getAllBatchesService = async (
  query: IBatchQuery = {},
): Promise<{ meta: IPaginationMeta; data: IBatchResponse[] }> => {
  const queryBuilder = new QueryBuilder(query as Record<string, unknown>)
    .search(['name'])
    .filter({ exclude: ['page', 'limit', 'sortBy', 'sortOrder', 'search'] })
    .where({ deletedAt: null })
    .sort('createdAt', 'desc')
    .paginate(1, 10, 100);

  const prismaQuery = queryBuilder.build();

  const [batches, total] = await Promise.all([
    prisma.batch.findMany({
      where: prismaQuery.where as Prisma.BatchWhereInput,
      orderBy: prismaQuery.orderBy as Prisma.BatchOrderByWithRelationInput,
      skip: prismaQuery.skip,
      take: prismaQuery.take,
      include: {
        _count: {
          select: {
            enrollments: {
              where: {
                status: EnrollmentStatus.ENROLLED,
              },
            },
          },
        },
      },
    }),
    prisma.batch.count({ where: prismaQuery.where as Prisma.BatchWhereInput }),
  ]);

  const meta = queryBuilder.getPaginationMeta(total);
  const formattedData = batches.map((batch) => formatBatchResponse(batch));

  return {
    meta,
    data: formattedData,
  };
};
