import type { Prisma } from '@prisma/client';
import { prisma } from '../../../config';
import { type IPaginationMeta, QueryBuilder } from '../../../utils';
import type {
  ITeacherAttendanceQuery,
  ITeacherAttendanceReportResponse,
} from '../attendance.interface';
import {
  calculateAttendanceStats,
  formatTeacherAttendanceRecordResponse,
  normalizeDateToUtc,
} from '../attendance.utils';

export const getTeacherAttendanceService = async (
  query: ITeacherAttendanceQuery = {},
): Promise<{ meta: IPaginationMeta; data: ITeacherAttendanceReportResponse }> => {
  // 1. Build Date conditions
  const dateCondition: Record<string, unknown> = {};
  if (query.date) {
    dateCondition.date = normalizeDateToUtc(query.date);
  } else if (query.startDate || query.endDate) {
    const range: Record<string, unknown> = {};
    if (query.startDate) {
      range.gte = normalizeDateToUtc(query.startDate);
    }
    if (query.endDate) {
      range.lte = normalizeDateToUtc(query.endDate);
    }
    dateCondition.date = range;
  }

  // 2. Query Builder
  const queryBuilder = new QueryBuilder(query as Record<string, unknown>)
    .search(['teacher.name', 'teacher.email', 'teacher.phone'])
    .filter({
      exclude: ['page', 'limit', 'sortBy', 'sortOrder', 'search', 'date', 'startDate', 'endDate'],
    })
    .where({
      teacher: {
        deletedAt: null,
      },
      ...dateCondition,
    })
    .sort('date', 'desc')
    .paginate(1, 10, 100);

  const prismaQuery = queryBuilder.build();

  const [records, allStatusRecords, total] = await Promise.all([
    prisma.teacherAttendanceRecord.findMany({
      where: prismaQuery.where as Prisma.TeacherAttendanceRecordWhereInput,
      orderBy: prismaQuery.orderBy as Prisma.TeacherAttendanceRecordOrderByWithRelationInput,
      skip: prismaQuery.skip,
      take: prismaQuery.take,
      include: {
        teacher: {
          include: {
            teacherProfile: true,
          },
        },
        markedBy: true,
      },
    }),
    prisma.teacherAttendanceRecord.findMany({
      where: prismaQuery.where as Prisma.TeacherAttendanceRecordWhereInput,
      select: {
        status: true,
      },
    }),
    prisma.teacherAttendanceRecord.count({
      where: prismaQuery.where as Prisma.TeacherAttendanceRecordWhereInput,
    }),
  ]);

  const meta = queryBuilder.getPaginationMeta(total);
  const stats = calculateAttendanceStats(allStatusRecords);
  const formattedRecords = records.map(formatTeacherAttendanceRecordResponse);

  return {
    meta,
    data: {
      dateFilter: query.date,
      startDate: query.startDate,
      endDate: query.endDate,
      stats,
      records: formattedRecords,
    },
  };
};
