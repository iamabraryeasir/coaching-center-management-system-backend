import {
  AttendanceStatus,
  BatchStatus,
  EnrollmentStatus,
  PaymentStatus,
  Role,
  UserStatus,
} from '@prisma/client';
import { prisma } from '../../../config';
import { getBangladeshTodayString, normalizeDateToUtc } from '../../../utils';
import type { ITodayDashboardResponse } from '../dashboard.interface';

/**
 * Aggregates real-time operational numbers for today's date in Bangladesh Standard Time (BST).
 */
export const getTodayDashboard = async (): Promise<ITodayDashboardResponse> => {
  const dateStr = getBangladeshTodayString();
  const todayCalendarDate = normalizeDateToUtc(dateStr);

  const todayStart = new Date(`${dateStr}T00:00:00.000+06:00`);
  const todayEnd = new Date(`${dateStr}T23:59:59.999+06:00`);

  const [
    collectionAgg,
    activeBatches,
    studentAttendanceRecords,
    totalTeachers,
    teacherAttendanceRecords,
    pendingStudentApplications,
    pendingEnrollments,
    recentTxList,
  ] = await Promise.all([
    // 1. Payment collection today
    prisma.paymentTransaction.aggregate({
      where: {
        paidAt: { gte: todayStart, lte: todayEnd },
        status: PaymentStatus.COMPLETED,
        batch: { deletedAt: null },
        student: { deletedAt: null },
      },
      _sum: { amount: true },
      _count: { _all: true },
    }),

    // 2. Total active ongoing batches
    prisma.batch.findMany({
      where: {
        status: BatchStatus.ONGOING,
        deletedAt: null,
      },
      select: { id: true },
    }),

    // 3. Student attendance records today
    prisma.attendanceRecord.findMany({
      where: {
        date: todayCalendarDate,
        batch: { deletedAt: null },
        student: { deletedAt: null },
      },
      select: { status: true, batchId: true },
    }),

    // 4. Total active teachers
    prisma.user.count({
      where: {
        role: Role.TEACHER,
        status: UserStatus.ACTIVE,
        deletedAt: null,
      },
    }),

    // 5. Teacher attendance records today
    prisma.teacherAttendanceRecord.findMany({
      where: {
        date: todayCalendarDate,
        teacher: { deletedAt: null },
      },
      select: { status: true },
    }),

    // 6. Pending student onboarding applications
    prisma.user.count({
      where: {
        role: Role.STUDENT,
        status: UserStatus.PENDING_ACTIVATION,
        deletedAt: null,
      },
    }),

    // 7. Pending batch enrollment requests
    prisma.enrollment.count({
      where: {
        status: EnrollmentStatus.PENDING,
        batch: { deletedAt: null },
        student: { deletedAt: null },
      },
    }),

    // 8. Recent 5 completed payment transactions
    prisma.paymentTransaction.findMany({
      where: {
        status: PaymentStatus.COMPLETED,
        batch: { deletedAt: null },
        student: { deletedAt: null },
      },
      orderBy: { paidAt: 'desc' },
      take: 5,
      include: {
        student: { select: { name: true } },
        batch: { select: { name: true } },
      },
    }),
  ]);

  // Student Attendance Calculations
  const presentCount = studentAttendanceRecords.filter(
    (r) => r.status === AttendanceStatus.PRESENT,
  ).length;
  const absentCount = studentAttendanceRecords.filter(
    (r) => r.status === AttendanceStatus.ABSENT,
  ).length;
  const lateCount = studentAttendanceRecords.filter(
    (r) => r.status === AttendanceStatus.LATE,
  ).length;
  const totalMarked = studentAttendanceRecords.length;

  const attendanceRate =
    totalMarked > 0 ? Number((((presentCount + lateCount) / totalMarked) * 100).toFixed(2)) : null;

  const activeBatchIds = new Set(activeBatches.map((b) => b.id));
  const batchesTakenCount = new Set(
    studentAttendanceRecords.filter((r) => activeBatchIds.has(r.batchId)).map((r) => r.batchId),
  ).size;

  const totalActiveBatches = activeBatches.length;
  const notTakenBatches = Math.max(0, totalActiveBatches - batchesTakenCount);

  // Teacher Attendance Calculations
  const teacherCheckedInCount = teacherAttendanceRecords.filter(
    (r) => r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.LATE,
  ).length;
  const teacherAbsentCount = Math.max(0, totalTeachers - teacherCheckedInCount);

  return {
    date: dateStr,
    todayCollection: {
      totalAmount: Number(collectionAgg._sum.amount || 0),
      transactionCount: collectionAgg._count._all,
      currency: 'BDT',
    },
    attendance: {
      student: {
        presentCount,
        absentCount,
        lateCount,
        totalMarked,
        attendanceRate,
        batchesTakenCount,
        totalActiveBatches,
        notTakenBatches,
      },
      teacher: {
        checkedInCount: teacherCheckedInCount,
        totalTeachers,
        absentCount: teacherAbsentCount,
      },
    },
    pendingActions: {
      studentApplications: pendingStudentApplications,
      enrollmentRequests: pendingEnrollments,
      total: pendingStudentApplications + pendingEnrollments,
    },
    recentTransactions: recentTxList.map((tx) => ({
      id: tx.id,
      receiptNumber: tx.receiptNumber,
      studentName: tx.student.name,
      batchName: tx.batch.name,
      amount: Number(tx.amount),
      paymentMethod: tx.paymentMethod,
      paidAt: tx.paidAt.toISOString(),
    })),
  };
};
