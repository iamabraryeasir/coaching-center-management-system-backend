import { EnrollmentStatus, Permission, Role } from '@prisma/client';
import { prisma } from '../../../config';
import { ApiError, logger } from '../../../utils';
import type { IAttendanceRecordResponse, IBulkAttendanceInput } from '../attendance.interface';
import {
  assertAttendanceDateIsToday,
  formatAttendanceRecordResponse,
  normalizeDateToUtc,
} from '../attendance.utils';

export const markBulkAttendanceService = async (
  batchId: string,
  input: IBulkAttendanceInput,
  actorUserId: string,
  actorRole: Role,
): Promise<IAttendanceRecordResponse[]> => {
  // 1. Enforce today-only attendance marking (Bangladesh Standard Time)
  assertAttendanceDateIsToday(input.date);

  // 2. Permission check for Teacher
  if (actorRole === Role.TEACHER) {
    const hasPerm = await prisma.teacherPermission.findUnique({
      where: {
        teacherId_permission: {
          teacherId: actorUserId,
          permission: Permission.MANAGE_ATTENDANCE,
        },
      },
    });

    if (!hasPerm) {
      throw ApiError.forbidden(
        'You lack the MANAGE_ATTENDANCE permission required to mark attendance.',
      );
    }
  }

  // 2. Verify batch exists
  const batch = await prisma.batch.findFirst({
    where: {
      id: batchId,
      deletedAt: null,
    },
  });

  if (!batch) {
    throw ApiError.notFound('Batch not found');
  }

  // 3. Verify all student IDs are actively enrolled in this batch
  const studentIds = input.records.map((r) => r.studentId);
  const activeEnrollments = await prisma.enrollment.findMany({
    where: {
      batchId,
      studentId: {
        in: studentIds,
      },
      status: EnrollmentStatus.ENROLLED,
      student: {
        deletedAt: null,
      },
    },
    select: {
      studentId: true,
    },
  });

  const enrolledStudentIdSet = new Set(activeEnrollments.map((e) => e.studentId));

  for (const studentId of studentIds) {
    if (!enrolledStudentIdSet.has(studentId)) {
      throw ApiError.badRequest(
        `Student ID '${studentId}' is not an actively enrolled student in this batch.`,
      );
    }
  }

  const calendarDate = normalizeDateToUtc(input.date);

  // 4. Enforce submission once per day: Check if attendance for this batch has already been submitted for today
  const existingAttendanceCount = await prisma.attendanceRecord.count({
    where: {
      batchId,
      date: calendarDate,
    },
  });

  if (existingAttendanceCount > 0) {
    throw ApiError.conflict(
      `Attendance for batch '${batch.name}' has already been submitted for today (${input.date}). Once submitted, individual records can be edited anytime using the attendance update endpoint.`,
    );
  }

  // 5. Atomic creation of all records inside transaction
  const results = await prisma.$transaction(async (tx) => {
    const promises = input.records.map((record) =>
      tx.attendanceRecord.create({
        data: {
          batchId,
          studentId: record.studentId,
          markedById: actorUserId,
          date: calendarDate,
          status: record.status,
          remarks: record.remarks || null,
        },
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
    );

    return await Promise.all(promises);
  });

  logger.audit('ATTENDANCE_MARKED', {
    batchId,
    date: input.date,
    totalRecords: results.length,
    markedBy: actorUserId,
  });

  return results.map(formatAttendanceRecordResponse);
};
