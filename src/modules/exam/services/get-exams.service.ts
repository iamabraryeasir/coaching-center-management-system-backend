import { EnrollmentStatus, ExamStatus, type Prisma, Role } from '@prisma/client';
import { prisma } from '../../../config';
import { type IPaginationMeta, QueryBuilder } from '../../../utils';
import type { IExamQuery, IExamResponse } from '../exam.interface';
import { formatExamResponse, normalizeExamDateToUtc } from '../exam.utils';

export const getExamsService = async (
  query: IExamQuery = {},
  actorUserId?: string,
  actorRole?: Role,
): Promise<{ meta: IPaginationMeta; data: IExamResponse[] }> => {
  // 1. Build Date conditions
  const dateCondition: Record<string, unknown> = {};
  if (query.examDate) {
    dateCondition.examDate = normalizeExamDateToUtc(query.examDate);
  } else if (query.startDate || query.endDate) {
    const range: Record<string, unknown> = {};
    if (query.startDate) {
      range.gte = normalizeExamDateToUtc(query.startDate);
    }
    if (query.endDate) {
      range.lte = normalizeExamDateToUtc(query.endDate);
    }
    dateCondition.examDate = range;
  }

  // 2. Role-based scoping
  const roleCondition: Record<string, unknown> = {};
  if (actorRole === Role.STUDENT && actorUserId) {
    roleCondition.batch = {
      deletedAt: null,
      enrollments: {
        some: {
          studentId: actorUserId,
          status: EnrollmentStatus.ENROLLED,
        },
      },
    };
    roleCondition.status = { not: ExamStatus.CANCELLED };
  } else {
    roleCondition.batch = {
      deletedAt: null,
    };
  }

  // 3. Query Builder
  const queryBuilder = new QueryBuilder(query as Record<string, unknown>)
    .search(['title', 'description', 'batch.name'])
    .filter({
      exclude: [
        'page',
        'limit',
        'sortBy',
        'sortOrder',
        'search',
        'examDate',
        'startDate',
        'endDate',
      ],
    })
    .where({
      ...roleCondition,
      ...dateCondition,
    })
    .sort('examDate', 'desc')
    .paginate(1, 10, 100);

  const prismaQuery = queryBuilder.build();

  const [exams, total] = await Promise.all([
    prisma.exam.findMany({
      where: prismaQuery.where as Prisma.ExamWhereInput,
      orderBy: prismaQuery.orderBy as Prisma.ExamOrderByWithRelationInput,
      skip: prismaQuery.skip,
      take: prismaQuery.take,
      include: {
        batch: true,
      },
    }),
    prisma.exam.count({
      where: prismaQuery.where as Prisma.ExamWhereInput,
    }),
  ]);

  const meta = queryBuilder.getPaginationMeta(total);
  const formattedExams = exams.map((exam) => formatExamResponse(exam));

  return {
    meta,
    data: formattedExams,
  };
};
