import {
  AttendanceStatus,
  type Batch,
  type StudentProfile,
  type TeacherProfile,
  type User,
} from '@prisma/client';
import { format, parseISO, startOfDay } from 'date-fns';
import type {
  IAttendanceRecordResponse,
  IAttendanceStats,
  ITeacherAttendanceRecordResponse,
} from './attendance.interface';

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
 * Normalizes a YYYY-MM-DD date string into a Date object representing UTC calendar day start
 */
export const normalizeDateToUtc = (dateStr: string): Date => {
  return startOfDay(parseISO(`${dateStr}T00:00:00.000Z`));
};

/**
 * Formats a Date object to YYYY-MM-DD string using date-fns
 */
export const formatDateToCalendarString = (date: Date): string => {
  return format(date, 'yyyy-MM-dd');
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
