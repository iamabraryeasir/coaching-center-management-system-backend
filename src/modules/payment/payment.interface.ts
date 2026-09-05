import type { PaymentMethod, PaymentStatus } from '@prisma/client';

export interface ICreateCheckoutSessionInput {
  batchId: string;
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
  amount: number;
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  notes?: string;
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
