import { AttendanceStatus, Role, UserStatus } from '@prisma/client';
import { prisma } from '../../../config';
import { ApiError, logger } from '../../../utils';
import type {
  ISelfCheckInTeacherInput,
  ITeacherAttendanceRecordResponse,
} from '../attendance.interface';
import {
  formatDateToCalendarString,
  formatTeacherAttendanceRecordResponse,
  normalizeDateToUtc,
} from '../attendance.utils';

export const selfCheckInTeacherService = async (
  teacherId: string,
  input?: ISelfCheckInTeacherInput,
): Promise<ITeacherAttendanceRecordResponse> => {
  // 1. Verify user exists, is ACTIVE, and has Role.TEACHER
  const teacher = await prisma.user.findFirst({
    where: {
      id: teacherId,
      role: Role.TEACHER,
      status: UserStatus.ACTIVE,
      deletedAt: null,
    },
    include: {
      teacherProfile: true,
    },
  });

  if (!teacher) {
    throw ApiError.notFound('Teacher profile not found or inactive');
  }

  // 2. Determine today's date in UTC
  const now = new Date();
  const dateStr = formatDateToCalendarString(now);
  const normalizedDate = normalizeDateToUtc(dateStr);

  // 3. Upsert teacher attendance record for today
  const record = await prisma.teacherAttendanceRecord.upsert({
    where: {
      teacherId_date: {
        teacherId,
        date: normalizedDate,
      },
    },
    update: {
      status: AttendanceStatus.PRESENT,
      checkInTime: now,
      remarks: input?.remarks ?? 'Teacher self check-in',
      markedById: teacherId,
    },
    create: {
      teacherId,
      markedById: teacherId,
      date: normalizedDate,
      status: AttendanceStatus.PRESENT,
      checkInTime: now,
      remarks: input?.remarks ?? 'Teacher self check-in',
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

  // 4. Audit Log
  logger.audit('TEACHER_SELF_CHECK_IN', {
    teacherId,
    date: dateStr,
    checkInTime: now.toISOString(),
  });

  return formatTeacherAttendanceRecordResponse(record);
};
