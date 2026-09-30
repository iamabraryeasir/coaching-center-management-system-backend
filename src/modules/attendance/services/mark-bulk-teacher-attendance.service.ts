import { Permission, Role, UserStatus } from '@prisma/client';
import { prisma } from '../../../config';
import { ApiError, logger } from '../../../utils';
import type {
  IBulkTeacherAttendanceInput,
  ITeacherAttendanceRecordResponse,
} from '../attendance.interface';
import {
  assertAttendanceDateIsToday,
  formatTeacherAttendanceRecordResponse,
  normalizeDateToUtc,
} from '../attendance.utils';

export const markBulkTeacherAttendanceService = async (
  input: IBulkTeacherAttendanceInput,
  markedById: string,
  actorRole?: Role,
): Promise<{
  markedCount: number;
  date: string;
  records: ITeacherAttendanceRecordResponse[];
}> => {
  // 1. Enforce today-only attendance marking (Bangladesh Standard Time)
  assertAttendanceDateIsToday(input.date);

  // 2. Permission check for Teacher
  if (actorRole === Role.TEACHER) {
    const hasPerm = await prisma.teacherPermission.findUnique({
      where: {
        teacherId_permission: {
          teacherId: markedById,
          permission: Permission.MANAGE_ATTENDANCE,
        },
      },
    });

    if (!hasPerm) {
      throw ApiError.forbidden(
        'You lack the MANAGE_ATTENDANCE permission required to mark teacher attendance.',
      );
    }
  }

  const normalizedDate = normalizeDateToUtc(input.date);

  // 3. Collect and deduplicate teacher IDs
  const teacherIds = [...new Set(input.records.map((r) => r.teacherId))];

  // 2. Validate all teachers exist, are ACTIVE, have Role.TEACHER, and are not soft-deleted
  const validTeachers = await prisma.user.findMany({
    where: {
      id: { in: teacherIds },
      role: Role.TEACHER,
      status: UserStatus.ACTIVE,
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
    },
  });

  const validTeacherIdSet = new Set(validTeachers.map((t) => t.id));
  const invalidTeacherIds = teacherIds.filter((id) => !validTeacherIdSet.has(id));

  if (invalidTeacherIds.length > 0) {
    throw ApiError.badRequest(
      `The following teacher IDs are invalid, inactive, or not registered as teachers: ${invalidTeacherIds.join(', ')}`,
    );
  }

  // 3. Check if attendance has already been submitted for any of these teachers today

  const existingTeacherRecords = await prisma.teacherAttendanceRecord.findMany({
    where: {
      teacherId: { in: teacherIds },
      date: normalizedDate,
    },
    include: {
      teacher: { select: { name: true } },
    },
  });

  if (existingTeacherRecords.length > 0) {
    const existingNames = existingTeacherRecords.map((r) => r.teacher.name).join(', ');
    throw ApiError.conflict(
      `Attendance has already been submitted today for the following teacher(s): ${existingNames}. Once submitted, records can be edited anytime using the teacher attendance update endpoint.`,
    );
  }

  // 4. Perform atomic creation in a database transaction
  const createdRecords = await prisma.$transaction(async (tx) => {
    const results = [];

    for (const record of input.records) {
      const created = await tx.teacherAttendanceRecord.create({
        data: {
          teacherId: record.teacherId,
          markedById,
          date: normalizedDate,
          status: record.status,
          remarks: record.remarks ?? null,
        },
        include: {
          teacher: {
            include: {
              teacherProfile: true,
            },
          },
          markedBy: true,
        },
      });

      results.push(created);
    }

    return results;
  });

  // 5. Audit Log
  logger.audit('TEACHER_ATTENDANCE_MARKED', {
    date: input.date,
    markedById,
    recordsCount: createdRecords.length,
    presentCount: input.records.filter((r) => r.status === 'PRESENT').length,
    absentCount: input.records.filter((r) => r.status === 'ABSENT').length,
  });

  return {
    markedCount: createdRecords.length,
    date: input.date,
    records: createdRecords.map(formatTeacherAttendanceRecordResponse),
  };
};
