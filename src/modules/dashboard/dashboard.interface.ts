import type { PaymentMethod } from '@prisma/client';

export interface ITodayCollection {
  totalAmount: number;
  transactionCount: number;
  currency: 'BDT';
}

export interface ITodayStudentAttendance {
  presentCount: number;
  absentCount: number;
  lateCount: number;
  totalMarked: number;
  attendanceRate: number | null;
  batchesTakenCount: number;
  totalActiveBatches: number;
  notTakenBatches: number;
}

export interface ITodayTeacherAttendance {
  checkedInCount: number;
  totalTeachers: number;
  absentCount: number;
}

export interface ITodayPendingActions {
  studentApplications: number;
  enrollmentRequests: number;
  total: number;
}

export interface ITodayRecentTransaction {
  id: string;
  receiptNumber: string;
  studentName: string;
  batchName: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paidAt: string;
}

export interface ITodayDashboardResponse {
  date: string;
  todayCollection: ITodayCollection;
  attendance: {
    student: ITodayStudentAttendance;
    teacher: ITodayTeacherAttendance;
  };
  pendingActions: ITodayPendingActions;
  recentTransactions: ITodayRecentTransaction[];
}

export interface IMonthlySummaryQuery {
  month?: number;
  year?: number;
}

export interface IMonthlyFinancialSummary {
  expectedRevenue: number;
  collectedAmount: number;
  totalDue: number;
  collectionRate: number;
  paidCount: number;
  partialCount: number;
  unpaidCount: number;
  currency: 'BDT';
}

export interface IMonthlyAcademicSummary {
  totalExams: number;
  publishedResults: number;
  upcomingExams: number;
  completedExams: number;
}

export interface IMonthlyBatchSummary {
  ongoingBatches: number;
  upcomingBatches: number;
  totalEnrollmentsThisMonth: number;
}

export interface IMonthlySummaryResponse {
  month: number;
  year: number;
  billingPeriodText: string;
  financial: IMonthlyFinancialSummary;
  academic: IMonthlyAcademicSummary;
  batches: IMonthlyBatchSummary;
}
