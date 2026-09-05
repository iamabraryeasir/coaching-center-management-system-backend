import { BatchStatus, EnrollmentStatus } from '@prisma/client';
import { z } from 'zod';

export const createBatchSchema = z.object({
  body: z.object({
    name: z
      .string({
        error: 'Batch name is required',
      })
      .trim()
      .min(2, 'Batch name must be at least 2 characters')
      .max(100, 'Batch name cannot exceed 100 characters'),
    fee: z
      .number({
        error: 'Batch fee is required and must be a number',
      })
      .nonnegative('Batch fee cannot be negative'),
    status: z.enum(BatchStatus, { error: 'Invalid batch status' }).optional(),
  }),
});

export const updateBatchSchema = z.object({
  params: z.object({
    id: z.uuid('Invalid batch ID format'),
  }),
  body: z
    .object({
      name: z
        .string()
        .trim()
        .min(2, 'Batch name must be at least 2 characters')
        .max(100, 'Batch name cannot exceed 100 characters')
        .optional(),
      fee: z.number().nonnegative('Batch fee cannot be negative').optional(),
      status: z.enum(BatchStatus, { error: 'Invalid batch status' }).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field must be provided for update',
    }),
});

export const batchIdParamSchema = z.object({
  params: z.object({
    id: z.uuid('Invalid batch ID format'),
  }),
});

export const enrollmentIdParamSchema = z.object({
  params: z.object({
    enrollmentId: z.uuid('Invalid enrollment ID format'),
  }),
});

export const adminDirectEnrollSchema = z.object({
  params: z.object({
    id: z.uuid('Invalid batch ID format'),
  }),
  body: z.object({
    studentId: z.uuid('Invalid student ID format'),
  }),
});

export const batchStudentParamsSchema = z.object({
  params: z.object({
    id: z.uuid('Invalid batch ID format'),
    studentId: z.uuid('Invalid student ID format'),
  }),
});

export const getBatchesQuerySchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/, 'Page must be a positive integer').transform(Number).optional(),
    limit: z
      .string()
      .regex(/^\d+$/, 'Limit must be a positive integer')
      .transform(Number)
      .optional(),
    search: z.string().trim().optional(),
    status: z.enum(BatchStatus, { error: 'Invalid batch status' }).optional(),
    fee_gte: z
      .string()
      .regex(/^\d+(\.\d+)?$/, 'fee_gte must be a valid number')
      .transform(Number)
      .optional(),
    fee_lte: z
      .string()
      .regex(/^\d+(\.\d+)?$/, 'fee_lte must be a valid number')
      .transform(Number)
      .optional(),
    sortBy: z.string().trim().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
});

export const getBatchStudentsQuerySchema = z.object({
  params: z.object({
    id: z.uuid('Invalid batch ID format'),
  }),
  query: z.object({
    page: z.string().regex(/^\d+$/, 'Page must be a positive integer').transform(Number).optional(),
    limit: z
      .string()
      .regex(/^\d+$/, 'Limit must be a positive integer')
      .transform(Number)
      .optional(),
    search: z.string().trim().optional(),
    status: z.enum(EnrollmentStatus, { error: 'Invalid enrollment status' }).optional(),
    sortBy: z.string().trim().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
});

export const getPendingEnrollmentsQuerySchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/, 'Page must be a positive integer').transform(Number).optional(),
    limit: z
      .string()
      .regex(/^\d+$/, 'Limit must be a positive integer')
      .transform(Number)
      .optional(),
    search: z.string().trim().optional(),
    batchId: z.uuid('Invalid batch ID format').optional(),
    sortBy: z.string().trim().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
});
