import type {
  Batch,
  BatchStatus,
  ClassRoutine,
  DayOfWeek,
  Enrollment,
  StudentProfile,
  TeacherProfile,
  User,
} from '@prisma/client';
import type { IBatchResponse, IClassRoutineItem, IEnrollmentResponse } from './batch.interface';

type RawRoutineWithTeacher = ClassRoutine & {
  teacher?: (User & { teacherProfile?: TeacherProfile | null }) | null;
};

type RawBatchWithRelations = Batch & {
  _count?: {
    enrollments?: number;
  };
  routines?: RawRoutineWithTeacher[];
  pendingCount?: number;
};

type RawEnrollmentWithRelations = Enrollment & {
  student?: (User & { studentProfile?: StudentProfile | null }) | null;
  batch?: Batch | null;
};

/**
 * Formats a single class routine with assigned teacher details
 */
export const formatClassRoutineItem = (routine: RawRoutineWithTeacher): IClassRoutineItem => {
  return {
    id: routine.id,
    dayOfWeek: routine.dayOfWeek as DayOfWeek,
    startTime: routine.startTime,
    endTime: routine.endTime,
    subject: routine.subject,
    room: routine.room,
    teacher: routine.teacher
      ? {
          id: routine.teacher.id,
          name: routine.teacher.name,
          email: routine.teacher.email,
          phone: routine.teacher.phone,
          designation: routine.teacher.teacherProfile?.designation ?? null,
        }
      : null,
  };
};

/**
 * Formats batch record with Decimal conversion, routine mappings, and enrollment counts
 */
export const formatBatchResponse = (
  batch: RawBatchWithRelations,
  enrolledCount?: number,
  pendingCount?: number,
): IBatchResponse => {
  return {
    id: batch.id,
    name: batch.name,
    fee: Number(batch.fee),
    status: batch.status as BatchStatus,
    enrolledStudentsCount:
      enrolledCount !== undefined ? enrolledCount : (batch._count?.enrollments ?? 0),
    pendingEnrollmentsCount: pendingCount,
    routines: batch.routines ? batch.routines.map(formatClassRoutineItem) : undefined,
    createdAt: batch.createdAt,
    updatedAt: batch.updatedAt,
  };
};

/**
 * Formats enrollment record with student profile and batch details
 */
export const formatEnrollmentResponse = (
  enrollment: RawEnrollmentWithRelations,
): IEnrollmentResponse => {
  return {
    id: enrollment.id,
    studentId: enrollment.studentId,
    batchId: enrollment.batchId,
    status: enrollment.status,
    enrolledAt: enrollment.enrolledAt,
    approvedAt: enrollment.approvedAt,
    createdAt: enrollment.createdAt,
    updatedAt: enrollment.updatedAt,
    student: enrollment.student
      ? {
          id: enrollment.student.id,
          name: enrollment.student.name,
          email: enrollment.student.email,
          phone: enrollment.student.phone,
          avatarUrl: enrollment.student.avatarUrl,
          studentProfile: enrollment.student.studentProfile
            ? {
                guardianName: enrollment.student.studentProfile.guardianName,
                guardianPhone: enrollment.student.studentProfile.guardianPhone,
                institutionName: enrollment.student.studentProfile.institutionName,
                classLevel: enrollment.student.studentProfile.classLevel,
                rollNumber: enrollment.student.studentProfile.rollNumber,
              }
            : null,
        }
      : undefined,
    batch: enrollment.batch
      ? {
          id: enrollment.batch.id,
          name: enrollment.batch.name,
          fee: Number(enrollment.batch.fee),
          status: enrollment.batch.status as BatchStatus,
        }
      : undefined,
  };
};
