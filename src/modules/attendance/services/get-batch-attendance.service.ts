import type { Prisma } from '@prisma/client';
import { prisma } from '../../../config';
import { ApiError, type IPaginationMeta, QueryBuilder } from '../../../utils';
import type { IAttendanceQuery, IBatchAttendanceReportResponse } from '../attendance.interface';
import {
  calculateAttendanceStats,
  formatAttendanceRecordResponse,
  normalizeDateToUtc,
} from '../attendance.utils';

export const getBatchAttendanceService = async (
  batchId: string,
  query: IAttendanceQuery = {},
): Promise<{ meta: IPaginationMeta; data: IBatchAttendanceReportResponse }> => {
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

  // 2. Build Date conditions
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

  // 3. Query Builder
  const queryBuilder = new QueryBuilder(query as Record<string, unknown>)
    .search(['student.name', 'student.email', 'student.phone'])
    .filter({
      exclude: ['page', 'limit', 'sortBy', 'sortOrder', 'search', 'date', 'startDate', 'endDate'],
    })
    .where({
      batchId,
      student: {
        deletedAt: null,
      },
      ...dateCondition,
    })
    .sort('date', 'desc')
    .paginate(1, 10, 100);

  const prismaQuery = queryBuilder.build();

  const [records, allStatusRecords, total] = await Promise.all([
    prisma.attendanceRecord.findMany({
      where: prismaQuery.where as Prisma.AttendanceRecordWhereInput,
      orderBy: prismaQuery.orderBy as Prisma.AttendanceRecordOrderByWithRelationInput,
      skip: prismaQuery.skip,
      take: prismaQuery.take,
      include: {
        student: {
          include: {
            studentProfile: true,
          },
        },
        batch: true,
        markedBy: true,
      },
    }),
    prisma.attendanceRecord.findMany({
      where: prismaQuery.where as Prisma.AttendanceRecordWhereInput,
      select: {
        status: true,
      },
    }),
    prisma.attendanceRecord.count({
      where: prismaQuery.where as Prisma.AttendanceRecordWhereInput,
    }),
  ]);

  const meta = queryBuilder.getPaginationMeta(total);
  const stats = calculateAttendanceStats(allStatusRecords);
  const formattedRecords = records.map(formatAttendanceRecordResponse);

  return {
    meta,
    data: {
      batchId: batch.id,
      batchName: batch.name,
      dateFilter: query.date,
      startDate: query.startDate,
      endDate: query.endDate,
      stats,
      records: formattedRecords,
    },
  };
};
