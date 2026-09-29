import { AttendanceStatus, DayOfWeek, EnrollmentStatus, ResultStatus, Role } from '@prisma/client';
import { prisma } from '../../../config';
import {
  ApiError,
  formatDateToCalendarString,
  formatInBangladeshTime,
  getBangladeshCurrentMonth,
  getBangladeshCurrentYear,
  toBangladeshTime,
} from '../../../utils';
import { calculateGrade } from '../../exam/exam.utils';
import { ensureMonthlyBillsForPeriod, MONTH_NAMES } from '../../payment/payment.utils';
import type {
  StudentBillingAlert,
  StudentDashboardKpis,
  StudentDashboardSummary,
  StudentEnrolledBatchSummary,
  StudentRecentExamResult,
  StudentTodayClass,
} from '../dashboard.interface';

/**
 * Maps a letter grade to a GPA on a 5.0 scale
 */
const getGpaFromGrade = (grade: string): number => {
  switch (grade) {
    case 'A+':
      return 5.0;
    case 'A':
      return 4.0;
    case 'A-':
      return 3.5;
    case 'B':
      return 3.0;
    case 'C':
      return 2.0;
    case 'D':
      return 1.0;
    default:
      return 0.0;
  }
};

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
 * Aggregates personalized dashboard analytics for a student
 */
export const getStudentDashboard = async (studentId: string): Promise<StudentDashboardSummary> => {
  // 1. Verify student exists and is active
  const student = await prisma.user.findFirst({
    where: {
      id: studentId,
      role: Role.STUDENT,
      deletedAt: null,
    },
  });

  if (!student) {
    throw ApiError.notFound('Student account not found.');
  }

  // 2. Fetch active enrollments with batch details and routines
  const enrollments = await prisma.enrollment.findMany({
    where: {
      studentId,
      status: EnrollmentStatus.ENROLLED,
      batch: {
        deletedAt: null,
      },
    },
    include: {
      batch: {
        include: {
          routines: {
            include: {
              teacher: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  const enrolledBatchIds = enrollments.map((e) => e.batchId);

  // 3. Format Enrolled Batches Summary
  const enrolledBatches: StudentEnrolledBatchSummary[] = enrollments.map((enr) => {
    const subjects = Array.from(
      new Set(enr.batch.routines.map((r) => r.subject).filter(Boolean)),
    ) as string[];
    const teachers = Array.from(
      new Set(enr.batch.routines.map((r) => r.teacher?.name).filter(Boolean)),
    ) as string[];

    return {
      batchId: enr.batch.id,
      batchName: enr.batch.name,
      subject: subjects.length > 0 ? subjects.join(', ') : enr.batch.name,
      fee: Number(enr.batch.fee),
      status: enr.batch.status,
      teacherName: teachers.length > 0 ? teachers.join(', ') : undefined,
      weeklyClassesCount: enr.batch.routines.length,
    };
  });

  // 4. Fetch Today's Classes based on BST Day of Week
  const bstNow = toBangladeshTime(new Date());
  const currentBstDayOfWeek = DAY_OF_WEEK_MAP[bstNow.getDay()];
  const currentBstTimeStr = formatInBangladeshTime(new Date(), 'HH:mm');

  let todayClasses: StudentTodayClass[] = [];

  if (enrolledBatchIds.length > 0) {
    const todayRoutines = await prisma.classRoutine.findMany({
      where: {
        batchId: { in: enrolledBatchIds },
        dayOfWeek: currentBstDayOfWeek,
        batch: { deletedAt: null },
      },
      include: {
        batch: { select: { id: true, name: true } },
        teacher: { select: { id: true, name: true } },
      },
      orderBy: { startTime: 'asc' },
    });

    todayClasses = todayRoutines.map((routine) => {
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
        subject: routine.subject || routine.batch.name || 'General',
        batchId: routine.batchId,
        batchName: routine.batch.name,
        startTime: routine.startTime,
        endTime: routine.endTime,
        room: routine.room || 'TBA',
        teacherName: routine.teacher?.name || 'TBA',
        status,
      };
    });
  }

  // 5. Billing Alert & Dues for Current Month
  const targetMonth = getBangladeshCurrentMonth();
  const targetYear = getBangladeshCurrentYear();
  const billingMonthText = `${MONTH_NAMES[targetMonth - 1]} ${targetYear}`;

  await ensureMonthlyBillsForPeriod(prisma, targetMonth, targetYear);

  const bills = await prisma.monthlyFeeBill.findMany({
    where: {
      studentId,
      billingMonth: targetMonth,
      billingYear: targetYear,
      batch: { deletedAt: null },
    },
  });

  const effectiveMonthlyFee = bills.reduce((sum, b) => sum + Number(b.monthlyFee), 0);
  const arrears = bills.reduce((sum, b) => sum + Number(b.previousDue), 0);
  const totalPaid = bills.reduce((sum, b) => sum + Number(b.paidAmount), 0);
  const totalDue = bills.reduce((sum, b) => sum + Number(b.dueAmount), 0);

  const isFullyPaid = totalDue <= 0;
  let paymentStatus: 'PAID' | 'UNPAID' | 'PARTIAL' = 'UNPAID';
  if (isFullyPaid) {
    paymentStatus = 'PAID';
  } else if (totalPaid > 0) {
    paymentStatus = 'PARTIAL';
  } else {
    paymentStatus = 'UNPAID';
  }

  const billing: StudentBillingAlert = {
    totalDue,
    effectiveMonthlyFee,
    arrears,
    totalPaid,
    paymentStatus,
    isFullyPaid,
    billingMonth: billingMonthText,
  };

  // 6. Attendance Metrics
  const attendanceRecords = await prisma.attendanceRecord.findMany({
    where: {
      studentId,
      batch: { deletedAt: null },
    },
    select: {
      status: true,
    },
  });

  const totalClassesMarked = attendanceRecords.length;
  const presentCount = attendanceRecords.filter(
    (r) => r.status === AttendanceStatus.PRESENT,
  ).length;
  const lateCount = attendanceRecords.filter((r) => r.status === AttendanceStatus.LATE).length;
  const attendanceRate =
    totalClassesMarked > 0
      ? Number((((presentCount + lateCount) / totalClassesMarked) * 100).toFixed(2))
      : 0;

  // 7. Exam Results & Performance Analytics
  const examResults = await prisma.examResult.findMany({
    where: {
      studentId,
      exam: {
        resultStatus: ResultStatus.PUBLISHED,
        batch: { deletedAt: null },
      },
    },
    include: {
      exam: {
        include: {
          batch: { select: { id: true, name: true } },
          results: {
            select: {
              studentId: true,
              marksObtained: true,
            },
          },
        },
      },
    },
    orderBy: {
      exam: {
        examDate: 'desc',
      },
    },
  });

  const totalExamsEvaluated = examResults.length;
  const gpaSum = examResults.reduce((sum, item) => {
    const totalMarks = Number(item.exam.totalMarks);
    const passMarks = Number(item.exam.passMarks);
    const marksObtained = Number(item.marksObtained);
    const letterGrade = item.grade || calculateGrade(marksObtained, totalMarks, passMarks);
    return sum + getGpaFromGrade(letterGrade);
  }, 0);

  const averageGpa =
    totalExamsEvaluated > 0 ? Number((gpaSum / totalExamsEvaluated).toFixed(2)) : 0.0;

  const recentExams: StudentRecentExamResult[] = examResults.slice(0, 5).map((item) => {
    const totalMarks = Number(item.exam.totalMarks);
    const passMarks = Number(item.exam.passMarks);
    const marksObtained = Number(item.marksObtained);
    const letterGrade = item.grade || calculateGrade(marksObtained, totalMarks, passMarks);
    const gpa = getGpaFromGrade(letterGrade);
    const isPassed = marksObtained >= passMarks;

    const rank =
      item.exam.results.filter((peer) => Number(peer.marksObtained) > marksObtained).length + 1;

    return {
      examId: item.exam.id,
      examTitle: item.exam.title,
      batchName: item.exam.batch.name,
      examDate: formatDateToCalendarString(item.exam.examDate),
      marksObtained,
      totalMarks,
      letterGrade,
      gpa,
      rank,
      isPassed,
    };
  });

  // 8. Aggregate Student KPIs
  const kpis: StudentDashboardKpis = {
    enrolledBatchesCount: enrollments.length,
    attendanceRate,
    totalClassesMarked,
    presentCount,
    averageGpa,
    totalExamsEvaluated,
    totalDue,
    paymentStatus,
  };

  return {
    kpis,
    todayClasses,
    billing,
    recentExams,
    enrolledBatches,
  };
};
