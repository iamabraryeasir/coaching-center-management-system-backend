import { PaymentMethod, PaymentStatus } from '@prisma/client';
import { z } from 'zod';

export const createCheckoutSessionSchema = z.object({
  body: z.object({
    batchId: z.string().uuid('Invalid batch ID format'),
    currency: z.enum(['bdt', 'usd']).default('bdt'),
  }),
});

export const manualPaymentCollectionSchema = z.object({
  body: z.object({
    studentId: z.string().uuid('Invalid student ID format'),
    batchId: z.string().uuid('Invalid batch ID format'),
    amount: z.number().positive('Amount must be greater than 0'),
    paymentMethod: z.enum([
      PaymentMethod.CASH,
      PaymentMethod.BKASH,
      PaymentMethod.NAGAD,
      PaymentMethod.BANK_TRANSFER,
    ]),
    referenceNumber: z.string().trim().max(100).optional(),
    notes: z.string().trim().max(500).optional(),
  }),
});

export const getPaymentsQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    sortBy: z.string().default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
    searchTerm: z.string().optional(),
    status: z
      .enum([
        PaymentStatus.PENDING,
        PaymentStatus.COMPLETED,
        PaymentStatus.FAILED,
        PaymentStatus.REFUNDED,
      ])
      .optional(),
    paymentMethod: z
      .enum([
        PaymentMethod.STRIPE,
        PaymentMethod.CASH,
        PaymentMethod.BKASH,
        PaymentMethod.NAGAD,
        PaymentMethod.BANK_TRANSFER,
      ])
      .optional(),
    batchId: z.string().uuid('Invalid batch ID format').optional(),
    studentId: z.string().uuid('Invalid student ID format').optional(),
  }),
});

export const paymentIdParamSchema = z.object({
  params: z.object({
    paymentId: z.string().uuid('Invalid payment ID format'),
  }),
});

export const receiptIdParamSchema = z.object({
  params: z.object({
    receiptId: z.string().uuid('Invalid receipt ID format'),
  }),
});

export const transactionIdParamSchema = z.object({
  params: z.object({
    transactionId: z.string().uuid('Invalid transaction ID format'),
  }),
});
