import { type Prisma, Role } from '@prisma/client';
import { prisma } from '../../../config';
import { ApiError, type IPaginationMeta, QueryBuilder } from '../../../utils';
import type { IAttendanceQuery, IStudentAttendanceSummaryResponse } from '../attendance.interface';
import {
  calculateAttendanceStats,
  formatAttendanceRecordResponse,
  normalizeDateToUtc,
} from '../attendance.utils';

export const getStudentAttendanceService = async (
  studentId: string,
  query: IAttendanceQuery = {},
): Promise<{
  meta: IPaginationMeta;
  data: IStudentAttendanceSummaryResponse;
}> => {
  const student = await prisma.user.findFirst({
    where: {
      id: studentId,
      role: Role.STUDENT,
      deletedAt: null,
    },
  });

  if (!student) {
    throw ApiError.notFound('Student not found');
  }

  const dateCondition: Record<string, unknown> = {};
  if (query.startDate || query.endDate) {
    const range: Record<string, unknown> = {};
    if (query.startDate) {
      range.gte = normalizeDateToUtc(query.startDate);
    }
    if (query.endDate) {
      range.lte = normalizeDateToUtc(query.endDate);
    }
    dateCondition.date = range;
  }

  const queryBuilder = new QueryBuilder(query as Record<string, unknown>)
    .filter({
      exclude: ['page', 'limit', 'sortBy', 'sortOrder', 'search', 'startDate', 'endDate'],
    })
    .where({
      studentId,
      batch: {
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
        batch: true,
        markedBy: true,
      },
    }),
    prisma.attendanceRecord.findMany({
      where: {
        studentId,
        batch: {
          deletedAt: null,
        },
      },
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
      studentId: student.id,
      studentName: student.name,
      stats,
      recentRecords: formattedRecords,
    },
  };
};
