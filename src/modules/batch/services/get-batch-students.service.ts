import { EnrollmentStatus, type Prisma } from '@prisma/client';
import { prisma } from '../../../config';
import { ApiError, type IPaginationMeta, QueryBuilder } from '../../../utils';
import type { IBatchStudentsQuery, IEnrollmentResponse } from '../batch.interface';
import { formatEnrollmentResponse } from '../batch.utils';

export const getBatchStudentsService = async (
  batchId: string,
  query: IBatchStudentsQuery = {},
): Promise<{ meta: IPaginationMeta; data: IEnrollmentResponse[] }> => {
  // 1. Verify batch exists
  const batch = await prisma.batch.findFirst({
    where: {
      id: batchId,
      deletedAt: null,
    },
  });

  if (!batch) {
    throw ApiError.notFound('Batch not found');
  }

  // 2. Query builder
  const queryBuilder = new QueryBuilder(query as Record<string, unknown>)
    .search(['student.name', 'student.email', 'student.phone'])
    .filter({ exclude: ['page', 'limit', 'sortBy', 'sortOrder', 'search'] })
    .where({
      batchId,
      status: query.status || EnrollmentStatus.ENROLLED,
      student: {
        deletedAt: null,
      },
    })
    .sort('createdAt', 'desc')
    .paginate(1, 10, 100);

  const prismaQuery = queryBuilder.build();

  const [enrollments, total] = await Promise.all([
    prisma.enrollment.findMany({
      where: prismaQuery.where as Prisma.EnrollmentWhereInput,
      orderBy: prismaQuery.orderBy as Prisma.EnrollmentOrderByWithRelationInput,
      skip: prismaQuery.skip,
      take: prismaQuery.take,
      include: {
        student: {
          include: {
            studentProfile: true,
          },
        },
      },
    }),
    prisma.enrollment.count({
      where: prismaQuery.where as Prisma.EnrollmentWhereInput,
    }),
  ]);

  const meta = queryBuilder.getPaginationMeta(total);
  const data = enrollments.map(formatEnrollmentResponse);

  return {
    meta,
    data,
  };
};
