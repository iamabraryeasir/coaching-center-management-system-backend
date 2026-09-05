import { type Prisma, Role } from '@prisma/client';
import { prisma } from '../../../config';
import { ApiError, type IPaginationMeta, QueryBuilder } from '../../../utils';
import type {
  ITeacherAttendanceQuery,
  ITeacherAttendanceSummaryResponse,
} from '../attendance.interface';
import {
  calculateAttendanceStats,
  formatTeacherAttendanceRecordResponse,
  normalizeDateToUtc,
} from '../attendance.utils';

export const getTeacherAttendanceSummaryService = async (
  teacherId: string,
  query: ITeacherAttendanceQuery = {},
): Promise<{
  meta: IPaginationMeta;
  data: ITeacherAttendanceSummaryResponse;
}> => {
  const teacher = await prisma.user.findFirst({
    where: {
      id: teacherId,
      role: Role.TEACHER,
      deletedAt: null,
    },
    include: {
      teacherProfile: true,
    },
  });

  if (!teacher) {
    throw ApiError.notFound('Teacher not found');
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
      teacherId,
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
      where: {
        teacherId,
      },
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
      teacherId: teacher.id,
      teacherName: teacher.name,
      stats,
      recentRecords: formattedRecords,
    },
  };
};
