import { EnrollmentStatus, type Prisma } from '@prisma/client';
import { prisma } from '../../../config';
import { type IPaginationMeta, QueryBuilder } from '../../../utils';
import type { IEnrollmentResponse, IPendingEnrollmentsQuery } from '../batch.interface';
import { formatEnrollmentResponse } from '../batch.utils';

export const getPendingEnrollmentsService = async (
  query: IPendingEnrollmentsQuery = {},
): Promise<{ meta: IPaginationMeta; data: IEnrollmentResponse[] }> => {
  const queryBuilder = new QueryBuilder(query as Record<string, unknown>)
    .search(['student.name', 'student.email', 'student.phone', 'batch.name'])
    .filter({
      exclude: ['page', 'limit', 'sortBy', 'sortOrder', 'search', 'batchId'],
    })
    .where({
      status: EnrollmentStatus.PENDING,
      batch: {
        deletedAt: null,
      },
      student: {
        deletedAt: null,
      },
      ...(query.batchId ? { batchId: query.batchId } : {}),
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
        batch: true,
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
