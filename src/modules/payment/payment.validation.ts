import { PaymentMethod, PaymentStatus } from '@prisma/client';
import { z } from 'zod';

export const createCheckoutSessionSchema = z.object({
  body: z.object({
    batchId: z.string().uuid('Invalid batch ID format'),
    billingMonth: z.coerce
      .number({
        error: 'billingMonth is required',
      })
      .int()
      .min(1, 'Billing month must be between 1 and 12')
      .max(12, 'Billing month must be between 1 and 12'),
    billingYear: z.coerce
      .number({
        error: 'billingYear is required',
      })
      .int()
      .min(2020, 'Billing year must be valid')
      .max(2100, 'Billing year must be valid'),
    currency: z.enum(['bdt', 'usd']).default('bdt'),
  }),
});

export const manualPaymentCollectionSchema = z.object({
  body: z.object({
    studentId: z.string().uuid('Invalid student ID format'),
    batchId: z.string().uuid('Invalid batch ID format'),
    billingMonth: z.coerce
      .number({
        error: 'billingMonth is required',
      })
      .int()
      .min(1, 'Billing month must be between 1 and 12')
      .max(12, 'Billing month must be between 1 and 12'),
    billingYear: z.coerce
      .number({
        error: 'billingYear is required',
      })
      .int()
      .min(2020, 'Billing year must be valid')
      .max(2100, 'Billing year must be valid'),
    amount: z.number().positive('Amount must be greater than 0'),
    paymentMethod: z.enum([
      PaymentMethod.CASH,
      PaymentMethod.BKASH,
      PaymentMethod.NAGAD,
      PaymentMethod.BANK_TRANSFER,
    ]),
    notes: z.string().trim().max(500).optional(),
  }),
});

export const setPreviousDuesSchema = z.object({
  params: z.object({
    enrollmentId: z.string().uuid('Invalid enrollment ID format'),
  }),
  body: z
    .object({
      startBillingMonth: z.coerce.number().int().min(1).max(12).optional(),
      startBillingYear: z.coerce.number().int().min(2020).max(2100).optional(),
      openingDue: z.number().min(0, 'Opening due cannot be negative').optional(),
      discountAmount: z.number().min(0, 'Discount amount cannot be negative').optional(),
      notes: z.string().trim().max(500).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field must be provided to adjust dues',
    }),
});

export const getDuesQuerySchema = z.object({
  query: z
    .object({
      batchId: z.string().uuid('Invalid batch ID format').optional(),
      month: z.coerce.number().int().min(1).max(12).optional(),
      year: z.coerce.number().int().min(2020).max(2100).optional(),
    })
    .optional(),
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
    billingMonth: z.coerce.number().int().min(1).max(12).optional(),
    billingYear: z.coerce.number().int().min(2020).max(2100).optional(),
  }),
});

export const paymentIdParamSchema = z.object({
  params: z.object({
    paymentId: z.string().uuid('Invalid payment ID format'),
  }),
});

export const transactionIdParamSchema = z.object({
  params: z.object({
    transactionId: z.string().uuid('Invalid transaction ID format'),
  }),
});
