import { Role, UserStatus } from '@prisma/client';
import { prisma } from '../../../config';
import { ApiError, logger } from '../../../utils';
import type {
  IBulkTeacherAttendanceInput,
  ITeacherAttendanceRecordResponse,
} from '../attendance.interface';
import { formatTeacherAttendanceRecordResponse, normalizeDateToUtc } from '../attendance.utils';

export const markBulkTeacherAttendanceService = async (
  input: IBulkTeacherAttendanceInput,
  markedById: string,
): Promise<{
  markedCount: number;
  date: string;
  records: ITeacherAttendanceRecordResponse[];
}> => {
  const normalizedDate = normalizeDateToUtc(input.date);

  // 1. Collect and deduplicate teacher IDs
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

  // 3. Perform atomic upsert in a database transaction
  const upsertedRecords = await prisma.$transaction(async (tx) => {
    const results = [];

    for (const record of input.records) {
      const upserted = await tx.teacherAttendanceRecord.upsert({
        where: {
          teacherId_date: {
            teacherId: record.teacherId,
            date: normalizedDate,
          },
        },
        update: {
          status: record.status,
          remarks: record.remarks ?? null,
          markedById,
        },
        create: {
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

      results.push(upserted);
    }

    return results;
  });

  // 4. Audit Log
  logger.audit('TEACHER_ATTENDANCE_MARKED', {
    date: input.date,
    markedById,
    recordsCount: upsertedRecords.length,
    presentCount: input.records.filter((r) => r.status === 'PRESENT').length,
    absentCount: input.records.filter((r) => r.status === 'ABSENT').length,
  });

  return {
    markedCount: upsertedRecords.length,
    date: input.date,
    records: upsertedRecords.map(formatTeacherAttendanceRecordResponse),
  };
};
