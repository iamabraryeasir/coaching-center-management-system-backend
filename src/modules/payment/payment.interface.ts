import type { PaymentMethod, PaymentStatus } from '@prisma/client';

export interface ICreateCheckoutSessionInput {
  batchId: string;
  billingMonth: number;
  billingYear: number;
  currency?: 'bdt' | 'usd';
}

export interface ICheckoutSessionResponse {
  sessionId: string;
  sessionUrl: string | null;
  transactionId: string;
}

export interface IManualPaymentInput {
  studentId: string;
  batchId: string;
  billingMonth: number;
  billingYear: number;
  amount: number;
  paymentMethod: PaymentMethod;
  notes?: string;
}

export interface ISetPreviousDuesInput {
  startBillingMonth?: number;
  startBillingYear?: number;
  openingDue?: number;
  discountAmount?: number;
  notes?: string;
}

export interface IStudentDueMonthItem {
  month: number;
  year: number;
  monthName: string;
  billingPeriod: string;
  amount: number;
}

export interface IStudentBatchDueSummary {
  batchId: string;
  batchName: string;
  monthlyFee: number;
  discountAmount: number;
  effectiveMonthlyFee: number;
  enrolledAt: Date;
  startBillingPeriod: string;
  unpaidMonths: IStudentDueMonthItem[];
  totalUnpaidMonthlyFee: number;
  openingDue: number;
  totalDueForBatch: number;
}

export interface IStudentDuesResponse {
  studentId: string;
  studentName: string;
  totalOpeningDue: number;
  totalMonthlyDue: number;
  totalOutstandingDue: number;
  batches: IStudentBatchDueSummary[];
}

export interface IAdminDefaulterItem {
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentPhone: string;
  batchId: string;
  batchName: string;
  monthlyFee: number;
  discountAmount: number;
  effectiveMonthlyFee: number;
  unpaidMonthsCount: number;
  unpaidMonths: string[];
  openingDue: number;
  totalOutstandingDue: number;
}

export interface IAdminDuesResponse {
  totalDefaulters: number;
  totalOutstandingAmount: number;
  defaulters: IAdminDefaulterItem[];
}

export interface IPaymentMethodBreakdown {
  method: PaymentMethod;
  count: number;
  totalAmount: number;
}

export interface IMonthlyRevenue {
  month: string;
  revenue: number;
  transactionCount: number;
}

export interface IPaymentStats {
  totalRevenue: number;
  totalTransactions: number;
  completedTransactions: number;
  pendingTransactions: number;
  failedTransactions: number;
  methodBreakdown: IPaymentMethodBreakdown[];
  monthlyRevenue: IMonthlyRevenue[];
}

export interface IReceiptResponse {
  id: string;
  receiptNumber: string;
  issuedAt: Date;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  billingMonth: number;
  billingYear: number;
  billingPeriod: string;
  notes?: string | null;
  student: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
  };
  batch: {
    id: string;
    name: string;
    fee: number;
  };
  transactionId: string;
  paidAt: Date | null;
  downloadUrl?: string | null;
}
