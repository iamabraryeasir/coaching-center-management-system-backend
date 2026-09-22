import { PaymentBillStatus, PaymentMethod, PaymentStatus } from '@prisma/client';
import { z } from 'zod';

export const getMonthlySheetQuerySchema = z.object({
  query: z.object({
    month: z.coerce.number().int().min(1).max(12).optional(),
    year: z.coerce.number().int().min(2020).max(2100).optional(),
    batchId: z.string().uuid('Invalid batch ID format').optional(),
    status: z.nativeEnum(PaymentBillStatus).optional(),
    search: z.string().trim().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),
});

export const getMonthlyStatsQuerySchema = z.object({
  query: z.object({
    month: z.coerce.number().int().min(1).max(12).optional(),
    year: z.coerce.number().int().min(2020).max(2100).optional(),
    batchId: z.string().uuid('Invalid batch ID format').optional(),
  }),
});

export const collectManualPaymentSchema = z.object({
  body: z.object({
    enrollmentId: z.string().uuid('Invalid enrollment ID format'),
    amount: z.coerce.number().positive('Payment amount must be greater than 0'),
    paymentMethod: z.nativeEnum(PaymentMethod, {
      error: 'Invalid payment method',
    }),
    notes: z.string().trim().max(500, 'Notes cannot exceed 500 characters').optional(),
    billingMonth: z.coerce.number().int().min(1).max(12).optional(),
    billingYear: z.coerce.number().int().min(2020).max(2100).optional(),
  }),
});

export const createCheckoutSessionSchema = z.object({
  body: z.object({
    billingMonth: z.coerce.number().int().min(1).max(12).optional(),
    billingYear: z.coerce.number().int().min(2020).max(2100).optional(),
    batchId: z.string().uuid('Invalid batch ID format').optional(),
    successUrl: z.string().url('Invalid success URL format').optional(),
    cancelUrl: z.string().url('Invalid cancel URL format').optional(),
  }),
});

export const getTransactionsQuerySchema = z.object({
  query: z.object({
    studentId: z.string().uuid('Invalid student ID format').optional(),
    batchId: z.string().uuid('Invalid batch ID format').optional(),
    paymentMethod: z.nativeEnum(PaymentMethod).optional(),
    status: z.nativeEnum(PaymentStatus).optional(),
    search: z.string().trim().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),
});
