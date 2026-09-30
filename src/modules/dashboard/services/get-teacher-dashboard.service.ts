import {
  AttendanceStatus,
  BatchStatus,
  DayOfWeek,
  EnrollmentStatus,
  ExamStatus,
  ResultStatus,
  Role,
} from '@prisma/client';
import { prisma } from '../../../config';
import {
  ApiError,
  formatDateToCalendarString,
  formatInBangladeshTime,
  getBangladeshTodayString,
  normalizeDateToUtc,
  toBangladeshTime,
} from '../../../utils';
import type {
  TeacherAssignedBatch,
  TeacherDashboardKpis,
  TeacherDashboardSummary,
  TeacherPendingExamTask,
  TeacherPersonalAttendance,
  TeacherTodayClass,
} from '../dashboard.interface';

/**
 * Maps Javascript getDay() index (0-6) to Prisma DayOfWeek enum
 */
const DAY_OF_WEEK_MAP: Record<number, DayOfWeek> = {
  0: DayOfWeek.SUNDAY,
  1: DayOfWeek.MONDAY,
  2: DayOfWeek.TUESDAY,
  3: DayOfWeek.WEDNESDAY,
  4: DayOfWeek.THURSDAY,
  5: DayOfWeek.FRIDAY,
  6: DayOfWeek.SATURDAY,
};

/**
 * Aggregates personalized dashboard analytics for a teacher
 */
export const getTeacherDashboard = async (teacherId: string): Promise<TeacherDashboardSummary> => {
  // 1. Verify teacher exists and is active
  const teacher = await prisma.user.findFirst({
    where: {
      id: teacherId,
      role: Role.TEACHER,
      deletedAt: null,
    },
    include: {
      teacherPermissions: {
        select: { permission: true },
      },
    },
  });

  if (!teacher) {
    throw ApiError.notFound('Teacher account not found.');
  }

  const permissions = teacher.teacherPermissions.map((p) => p.permission);

  // 2. Fetch assigned batches
  const assignedBatchesData = await prisma.batch.findMany({
    where: {
      deletedAt: null,
      routines: {
        some: { teacherId },
      },
    },
    include: {
      routines: {
        where: { teacherId },
      },
      _count: {
        select: {
          enrollments: {
            where: {
              status: EnrollmentStatus.ENROLLED,
              student: { deletedAt: null },
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const assignedBatchIds = assignedBatchesData.map((b) => b.id);

  const assignedBatches: TeacherAssignedBatch[] = assignedBatchesData.map((b) => {
    const subjects = Array.from(
      new Set(b.routines.map((r) => r.subject).filter(Boolean)),
    ) as string[];

    return {
      batchId: b.id,
      batchName: b.name,
      subject: subjects.length > 0 ? subjects.join(', ') : b.name,
      studentCount: b._count.enrollments,
      status: b.status,
      weeklyClassesCount: b.routines.length,
    };
  });

  const assignedBatchesCount = assignedBatchesData.length;
  const activeBatchesCount = assignedBatchesData.filter(
    (b) => b.status === BatchStatus.ONGOING,
  ).length;

  const uniqueStudentsTaught =
    assignedBatchIds.length > 0
      ? await prisma.enrollment.groupBy({
          by: ['studentId'],
          where: {
            batchId: { in: assignedBatchIds },
            status: EnrollmentStatus.ENROLLED,
            student: { deletedAt: null },
          },
        })
      : [];
  const totalStudentsTaught = uniqueStudentsTaught.length;

  // 3. Fetch Today's Classes based on BST Day of Week
  const bstNow = toBangladeshTime(new Date());
  const currentBstDayOfWeek = DAY_OF_WEEK_MAP[bstNow.getDay()];
  const currentBstTimeStr = formatInBangladeshTime(new Date(), 'HH:mm');
  const todayDateStr = getBangladeshTodayString();
  const todayCalendarDate = normalizeDateToUtc(todayDateStr);

  const todayRoutines = await prisma.classRoutine.findMany({
    where: {
      teacherId,
      dayOfWeek: currentBstDayOfWeek,
      batch: { deletedAt: null },
    },
    include: {
      batch: {
        include: {
          _count: {
            select: {
              enrollments: {
                where: {
                  status: EnrollmentStatus.ENROLLED,
                  student: { deletedAt: null },
                },
              },
            },
          },
        },
      },
    },
    orderBy: { startTime: 'asc' },
  });

  const todayBatchAttendanceCounts =
    todayRoutines.length > 0
      ? await prisma.attendanceRecord.groupBy({
          by: ['batchId'],
          where: {
            batchId: { in: todayRoutines.map((r) => r.batchId) },
            date: todayCalendarDate,
            batch: { deletedAt: null },
            student: { deletedAt: null },
          },
          _count: { _all: true },
        })
      : [];

  const attendanceTakenBatchSet = new Set(
    todayBatchAttendanceCounts.filter((item) => item._count._all > 0).map((item) => item.batchId),
  );

  const todayClasses: TeacherTodayClass[] = todayRoutines.map((routine) => {
    const isAttendanceTaken = attendanceTakenBatchSet.has(routine.batchId);
    let status: 'UPCOMING' | 'IN_PROGRESS' | 'COMPLETED' = 'UPCOMING';

    if (currentBstTimeStr < routine.startTime) {
      status = 'UPCOMING';
    } else if (currentBstTimeStr <= routine.endTime) {
      status = 'IN_PROGRESS';
    } else {
      status = 'COMPLETED';
    }

    return {
      id: routine.id,
      batchId: routine.batchId,
      batchName: routine.batch.name,
      subject: routine.subject || routine.batch.name || 'General',
      startTime: routine.startTime,
      endTime: routine.endTime,
      room: routine.room || 'TBA',
      totalStudents: routine.batch._count.enrollments,
      isAttendanceTaken,
      status,
    };
  });

  const classesTodayCount = todayClasses.length;
  const attendanceCompletedClassesCount = todayClasses.filter((c) => c.isAttendanceTaken).length;

  // 4. Exams & Pending Tasks
  const upcomingExamsCount =
    assignedBatchIds.length > 0
      ? await prisma.exam.count({
          where: {
            batchId: { in: assignedBatchIds },
            status: ExamStatus.UPCOMING,
            batch: { deletedAt: null },
          },
        })
      : 0;

  const pendingExamsData =
    assignedBatchIds.length > 0
      ? await prisma.exam.findMany({
          where: {
            batchId: { in: assignedBatchIds },
            resultStatus: ResultStatus.DRAFT,
            batch: { deletedAt: null },
          },
          include: {
            batch: {
              include: {
                _count: {
                  select: {
                    enrollments: {
                      where: {
                        status: EnrollmentStatus.ENROLLED,
                        student: { deletedAt: null },
                      },
                    },
                  },
                },
              },
            },
            _count: {
              select: {
                results: true,
              },
            },
          },
          orderBy: { examDate: 'desc' },
        })
      : [];

  const pendingExamTasks: TeacherPendingExamTask[] = pendingExamsData.map((exam) => ({
    examId: exam.id,
    title: exam.title,
    batchId: exam.batchId,
    batchName: exam.batch.name,
    examDate: exam.examDate.toISOString(),
    totalMarks: Number(exam.totalMarks),
    passMarks: Number(exam.passMarks),
    status: exam.status,
    resultStatus: exam.resultStatus,
    evaluatedCount: exam._count.results,
    totalStudents: exam.batch._count.enrollments,
  }));

  const pendingMarksExamsCount = pendingExamTasks.length;

  // 5. Personal Attendance
  const teacherAttendanceRecords = await prisma.teacherAttendanceRecord.findMany({
    where: { teacherId },
    orderBy: { date: 'desc' },
  });

  const todayRecord = teacherAttendanceRecords.find(
    (r) => formatDateToCalendarString(r.date) === todayDateStr,
  );

  const isCheckedInToday =
    !!todayRecord &&
    (todayRecord.status === AttendanceStatus.PRESENT ||
      todayRecord.status === AttendanceStatus.LATE);

  const checkInTime = todayRecord?.checkInTime ? todayRecord.checkInTime.toISOString() : null;

  const presentDays = teacherAttendanceRecords.filter(
    (r) => r.status === AttendanceStatus.PRESENT,
  ).length;
  const lateDays = teacherAttendanceRecords.filter(
    (r) => r.status === AttendanceStatus.LATE,
  ).length;
  const absentDays = teacherAttendanceRecords.filter(
    (r) => r.status === AttendanceStatus.ABSENT,
  ).length;
  const leaveDays = teacherAttendanceRecords.filter(
    (r) => r.status === AttendanceStatus.LEAVE || r.status === AttendanceStatus.EXCUSED,
  ).length;

  const totalAttendanceDays = teacherAttendanceRecords.length;
  const personalAttendanceRate =
    totalAttendanceDays > 0
      ? Number((((presentDays + lateDays) / totalAttendanceDays) * 100).toFixed(2))
      : 0.0;

  const personalAttendance: TeacherPersonalAttendance = {
    isCheckedInToday,
    checkInTime,
    attendanceRate: personalAttendanceRate,
    presentDays,
    lateDays,
    absentDays,
    leaveDays,
  };

  // 6. Aggregate Teacher KPIs
  const kpis: TeacherDashboardKpis = {
    assignedBatchesCount,
    activeBatchesCount,
    classesTodayCount,
    attendanceCompletedClassesCount,
    upcomingExamsCount,
    pendingMarksExamsCount,
    personalAttendanceRate,
    isCheckedInToday,
    totalStudentsTaught,
  };

  return {
    kpis,
    todayClasses,
    assignedBatches,
    pendingExamTasks,
    personalAttendance,
    permissions,
  };
};
