import { DayOfWeek } from '@prisma/client';
import { z } from 'zod';

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

export const createRoutineSchema = z.object({
  body: z
    .object({
      batchId: z.string().uuid('Invalid batch ID format'),
      dayOfWeek: z.nativeEnum(DayOfWeek, {
        error: 'Invalid day of week',
      }),
      startTime: z
        .string({
          error: 'Start time is required',
        })
        .regex(timeRegex, 'Start time must be in HH:mm format (e.g. 09:30 or 14:00)'),
      endTime: z
        .string({
          error: 'End time is required',
        })
        .regex(timeRegex, 'End time must be in HH:mm format (e.g. 11:00 or 15:30)'),
      subject: z
        .string()
        .trim()
        .min(2, 'Subject must be at least 2 characters')
        .max(100, 'Subject cannot exceed 100 characters')
        .optional(),
      room: z
        .string()
        .trim()
        .min(1, 'Room name cannot be empty')
        .max(50, 'Room name cannot exceed 50 characters')
        .optional(),
      teacherId: z.string().uuid('Invalid teacher ID format').optional(),
    })
    .refine((data) => data.startTime < data.endTime, {
      message: 'Start time must be earlier than end time',
      path: ['startTime'],
    }),
});

export const updateRoutineSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid routine ID format'),
  }),
  body: z
    .object({
      dayOfWeek: z.nativeEnum(DayOfWeek, { error: 'Invalid day of week' }).optional(),
      startTime: z
        .string()
        .regex(timeRegex, 'Start time must be in HH:mm format (e.g. 09:30 or 14:00)')
        .optional(),
      endTime: z
        .string()
        .regex(timeRegex, 'End time must be in HH:mm format (e.g. 11:00 or 15:30)')
        .optional(),
      subject: z
        .string()
        .trim()
        .min(2, 'Subject must be at least 2 characters')
        .max(100, 'Subject cannot exceed 100 characters')
        .optional(),
      room: z
        .string()
        .trim()
        .min(1, 'Room name cannot be empty')
        .max(50, 'Room name cannot exceed 50 characters')
        .optional(),
      teacherId: z.string().uuid('Invalid teacher ID format').nullable().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field must be provided for update',
    })
    .refine(
      (data) => {
        if (data.startTime && data.endTime) {
          return data.startTime < data.endTime;
        }
        return true;
      },
      {
        message: 'Start time must be earlier than end time',
        path: ['startTime'],
      },
    ),
});

export const routineIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid routine ID format'),
  }),
});

export const routineBatchIdParamSchema = z.object({
  params: z.object({
    batchId: z.string().uuid('Invalid batch ID format'),
  }),
});

export const teacherIdParamSchema = z.object({
  params: z.object({
    teacherId: z.string().uuid('Invalid teacher ID format'),
  }),
});

export const getRoutinesQuerySchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/, 'Page must be a positive integer').transform(Number).optional(),
    limit: z
      .string()
      .regex(/^\d+$/, 'Limit must be a positive integer')
      .transform(Number)
      .optional(),
    search: z.string().trim().optional(),
    batchId: z.string().uuid('Invalid batch ID format').optional(),
    dayOfWeek: z.nativeEnum(DayOfWeek, { error: 'Invalid day of week' }).optional(),
    teacherId: z.string().uuid('Invalid teacher ID format').optional(),
    room: z.string().trim().optional(),
    subject: z.string().trim().optional(),
    sortBy: z.string().trim().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
});
