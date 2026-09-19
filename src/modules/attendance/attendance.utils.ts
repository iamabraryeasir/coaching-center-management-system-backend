import {
  AttendanceStatus,
  type Batch,
  type StudentProfile,
  type TeacherProfile,
  type User,
} from '@prisma/client';
import {
  ApiError,
  BANGLADESH_TIMEZONE,
  formatDateToCalendarString,
  getBangladeshTodayString,
  normalizeDateToUtc,
} from '../../utils';
import type {
  IAttendanceRecordResponse,
  IAttendanceStats,
  ITeacherAttendanceRecordResponse,
} from './attendance.interface';

export {
  BANGLADESH_TIMEZONE,
  formatDateToCalendarString,
  getBangladeshTodayString,
  normalizeDateToUtc,
};

/**
 * Asserts that an input date string (YYYY-MM-DD) matches today's calendar date in Bangladesh Standard Time.
 * Throws ApiError if it is in the future or in the past.
 */
export const assertAttendanceDateIsToday = (dateStr: string): void => {
  const bstTodayStr = getBangladeshTodayString();

  if (dateStr > bstTodayStr) {
    throw ApiError.badRequest('Attendance cannot be marked for future dates.');
  }

  if (dateStr < bstTodayStr) {
    throw ApiError.badRequest(
      "Attendance can only be marked for today. Previous days' attendance can only be viewed.",
    );
  }
};

/**
 * Asserts that an existing attendance record's date is today in BST before allowing modification.
 * Throws ApiError if the record is from a previous day or a future day.
 */
export const assertAttendanceRecordIsToday = (recordDate: Date): void => {
  const recordDateStr = formatDateToCalendarString(recordDate);
  const bstTodayStr = getBangladeshTodayString();

  if (recordDateStr < bstTodayStr) {
    throw ApiError.badRequest(
      "Previous days' attendance records cannot be modified. They can only be viewed.",
    );
  }

  if (recordDateStr > bstTodayStr) {
    throw ApiError.badRequest('Future attendance records cannot be modified.');
  }
};

type RawAttendanceWithRelations = {
  id: string;
  batchId: string;
  studentId: string;
  markedById: string;
  date: Date;
  status: AttendanceStatus;
  remarks: string | null;
  createdAt: Date;
  updatedAt: Date;
  student?: (User & { studentProfile?: StudentProfile | null }) | null;
  batch?: Batch | null;
  markedBy?: User | null;
};

type RawTeacherAttendanceWithRelations = {
  id: string;
  teacherId: string;
  markedById: string;
  date: Date;
  status: AttendanceStatus;
  checkInTime: Date | null;
  remarks: string | null;
  createdAt: Date;
  updatedAt: Date;
  teacher?: (User & { teacherProfile?: TeacherProfile | null }) | null;
  markedBy?: User | null;
};

/**
 * Calculates aggregate attendance statistics from an array of attendance records
 */
export const calculateAttendanceStats = (
  records: Array<{ status: AttendanceStatus }>,
): IAttendanceStats => {
  let present = 0;
  let absent = 0;
  let late = 0;
  let excused = 0;
  let leave = 0;

  for (const r of records) {
    switch (r.status) {
      case AttendanceStatus.PRESENT:
        present++;
        break;
      case AttendanceStatus.ABSENT:
        absent++;
        break;
      case AttendanceStatus.LATE:
        late++;
        break;
      case AttendanceStatus.EXCUSED:
        excused++;
        break;
      case AttendanceStatus.LEAVE:
        leave++;
        break;
      default:
        break;
    }
  }

  const total = records.length;
  // Standard attendance rate: (PRESENT + LATE) / total * 100
  const rate = total > 0 ? Number((((present + late) / total) * 100).toFixed(2)) : 0;

  return {
    totalSessions: total,
    presentCount: present,
    absentCount: absent,
    lateCount: late,
    excusedCount: excused,
    leaveCount: leave,
    attendanceRate: rate,
  };
};

/**
 * Formats a Prisma student attendance record into a sanitized API response object
 */
export const formatAttendanceRecordResponse = (
  record: RawAttendanceWithRelations,
): IAttendanceRecordResponse => {
  return {
    id: record.id,
    batchId: record.batchId,
    studentId: record.studentId,
    markedById: record.markedById,
    date: formatDateToCalendarString(record.date),
    status: record.status,
    remarks: record.remarks,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    student: record.student
      ? {
          id: record.student.id,
          name: record.student.name,
          email: record.student.email,
          phone: record.student.phone,
          rollNumber: record.student.studentProfile?.rollNumber ?? null,
          classLevel: record.student.studentProfile?.classLevel ?? null,
        }
      : null,
    batch: record.batch
      ? {
          id: record.batch.id,
          name: record.batch.name,
        }
      : null,
    markedBy: record.markedBy
      ? {
          id: record.markedBy.id,
          name: record.markedBy.name,
          email: record.markedBy.email,
          role: record.markedBy.role,
        }
      : null,
  };
};

/**
 * Formats a Prisma teacher attendance record into a sanitized API response object
 */
export const formatTeacherAttendanceRecordResponse = (
  record: RawTeacherAttendanceWithRelations,
): ITeacherAttendanceRecordResponse => {
  return {
    id: record.id,
    teacherId: record.teacherId,
    markedById: record.markedById,
    date: formatDateToCalendarString(record.date),
    status: record.status,
    checkInTime: record.checkInTime,
    remarks: record.remarks,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    teacher: record.teacher
      ? {
          id: record.teacher.id,
          name: record.teacher.name,
          email: record.teacher.email,
          phone: record.teacher.phone,
          designation: record.teacher.teacherProfile?.designation ?? null,
          specialization: record.teacher.teacherProfile?.specialization ?? null,
        }
      : null,
    markedBy: record.markedBy
      ? {
          id: record.markedBy.id,
          name: record.markedBy.name,
          email: record.markedBy.email,
          role: record.markedBy.role,
        }
      : null,
  };
};
