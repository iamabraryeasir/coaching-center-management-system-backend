import type { PaymentBillStatus, PaymentMethod, PaymentStatus } from '@prisma/client';

export interface IMonthlySheetQuery {
  month?: number;
  year?: number;
  batchId?: string;
  status?: PaymentBillStatus;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface IMonthlySheetStudentRow {
  id: string; // MonthlyFeeBill ID
  enrollmentId: string;
  studentId: string;
  student: {
    id: string;
    name: string;
    email: string;
    phone: string;
    avatarUrl: string | null;
    rollNumber: string | null;
    classLevel: string | null;
  };
  batchId: string;
  batch: {
    id: string;
    name: string;
    fee: number;
  };
  billingMonth: number;
  billingYear: number;
  billingPeriodText: string;
  monthlyFee: number;
  previousDue: number;
  totalPayable: number;
  paidAmount: number;
  dueAmount: number;
  status: PaymentBillStatus;
  lastPaymentDate: Date | null;
  paymentCount: number;
}

export interface IMonthlyStatsQuery {
  month?: number;
  year?: number;
  batchId?: string;
}

export interface IMonthlyStatsResponse {
  billingMonth: number;
  billingYear: number;
  billingPeriodText: string;
  batchId: string | null;
  expectedRevenue: number;
  collectedAmount: number;
  totalDue: number;
  collectionRate: number; // percentage e.g. 65.5
  totalStudents: number;
  paidCount: number;
  partialCount: number;
  unpaidCount: number;
}

export interface ICollectManualPaymentPayload {
  enrollmentId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  notes?: string;
  billingMonth?: number;
  billingYear?: number;
}

export interface IStudentBillResponse {
  student: {
    id: string;
    name: string;
    email: string;
  };
  currentBillingMonth: number;
  currentBillingYear: number;
  currentBillingPeriodText: string;
  totalCurrentMonthFee: number;
  totalPreviousDue: number;
  netTotalPayable: number;
  netTotalPaid: number;
  netTotalRemainingDue: number;
  bills: Array<{
    id: string;
    enrollmentId: string;
    batchId: string;
    batchName: string;
    monthlyFee: number;
    previousDue: number;
    totalPayable: number;
    paidAmount: number;
    dueAmount: number;
    status: PaymentBillStatus;
  }>;
}

export interface ICreateCheckoutSessionPayload {
  billingMonth?: number;
  billingYear?: number;
  batchId?: string; // Optional: pay specific batch or all
  successUrl?: string;
  cancelUrl?: string;
}

export interface IGetTransactionsQuery {
  studentId?: string;
  batchId?: string;
  paymentMethod?: PaymentMethod;
  status?: PaymentStatus;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface IRevenueTrendQuery {
  months?: number;
}

export interface IRevenueTrendMonthItem {
  month: number;
  year: number;
  monthLabel: string;
  monthYear: string;
  expectedRevenue: number;
  collectedAmount: number;
  totalDue: number;
  collectionRate: number;
  transactionCount: number;
}

export interface IRevenueTrendResponse {
  months: number;
  trend: IRevenueTrendMonthItem[];
}

export interface IAdjustPreviousDuePayload {
  previousDue: number;
  reason?: string;
}

export interface IAdjustPreviousDueResponse {
  id: string;
  studentId: string;
  student: {
    id: string;
    name: string;
    email: string;
  };
  batchId: string;
  batch: {
    id: string;
    name: string;
    fee: number;
  };
  enrollmentId: string;
  billingMonth: number;
  billingYear: number;
  monthlyFee: number;
  previousDue: number;
  totalPayable: number;
  paidAmount: number;
  dueAmount: number;
  status: PaymentBillStatus;
  createdAt: Date;
  updatedAt: Date;
}
