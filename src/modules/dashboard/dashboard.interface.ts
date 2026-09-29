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

export interface StudentTodayClass {
  id: string;
  subject: string;
  batchId: string;
  batchName: string;
  startTime: string; // e.g. "10:00"
  endTime: string; // e.g. "11:30"
  room: string;
  teacherName: string;
  status: 'UPCOMING' | 'IN_PROGRESS' | 'COMPLETED';
}

export interface StudentDashboardKpis {
  enrolledBatchesCount: number;
  attendanceRate: number; // e.g. 92.5
  totalClassesMarked: number;
  presentCount: number;
  averageGpa: number; // e.g. 4.85
  totalExamsEvaluated: number;
  totalDue: number; // e.g. 2500
  paymentStatus: 'PAID' | 'UNPAID' | 'PARTIAL';
}

export interface StudentBillingAlert {
  totalDue: number;
  effectiveMonthlyFee: number;
  arrears: number;
  totalPaid: number;
  paymentStatus: 'PAID' | 'UNPAID' | 'PARTIAL';
  isFullyPaid: boolean;
  billingMonth: string; // e.g. "October 2026"
}

export interface StudentRecentExamResult {
  examId: string;
  examTitle: string;
  batchName: string;
  examDate: string;
  marksObtained: number;
  totalMarks: number;
  letterGrade: string; // "A+", "A", etc.
  gpa: number; // 5.0
  rank: number | null; // 1, 2, etc.
  isPassed: boolean;
}

export interface StudentEnrolledBatchSummary {
  batchId: string;
  batchName: string;
  subject: string;
  fee: number;
  status: string; // "ONGOING", "UPCOMING"
  teacherName?: string;
  weeklyClassesCount: number;
}

export interface StudentDashboardSummary {
  kpis: StudentDashboardKpis;
  todayClasses: StudentTodayClass[];
  billing: StudentBillingAlert;
  recentExams: StudentRecentExamResult[];
  enrolledBatches: StudentEnrolledBatchSummary[];
}

export interface IStudentDashboardQuery {
  studentId?: string;
}
