import { ExamStatus, ResultStatus } from '@prisma/client';
import { z } from 'zod';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const createExamSchema = z.object({
  body: z
    .object({
      batchId: z.string().uuid('Invalid batch ID format'),
      title: z
        .string({
          error: 'Exam title is required',
        })
        .trim()
        .min(2, 'Exam title must be at least 2 characters')
        .max(150, 'Exam title cannot exceed 150 characters'),
      description: z
        .string()
        .trim()
        .max(500, 'Description cannot exceed 500 characters')
        .optional(),
      totalMarks: z
        .number({
          error: 'Total marks is required',
        })
        .positive('Total marks must be a positive number')
        .max(1000, 'Total marks cannot exceed 1000'),
      passMarks: z
        .number({
          error: 'Pass marks is required',
        })
        .positive('Pass marks must be a positive number')
        .max(1000, 'Pass marks cannot exceed 1000'),
      examDate: z
        .string({
          error: 'Exam date is required',
        })
        .regex(dateRegex, 'Exam date must be in YYYY-MM-DD format'),
      status: z.nativeEnum(ExamStatus, { error: 'Invalid exam status' }).optional(),
    })
    .refine((data) => data.passMarks <= data.totalMarks, {
      message: 'Pass marks cannot be greater than total marks',
      path: ['passMarks'],
    }),
});

export const updateExamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid exam ID format'),
  }),
  body: z
    .object({
      title: z
        .string()
        .trim()
        .min(2, 'Exam title must be at least 2 characters')
        .max(150, 'Exam title cannot exceed 150 characters')
        .optional(),
      description: z
        .string()
        .trim()
        .max(500, 'Description cannot exceed 500 characters')
        .optional(),
      totalMarks: z
        .number()
        .positive('Total marks must be a positive number')
        .max(1000, 'Total marks cannot exceed 1000')
        .optional(),
      passMarks: z
        .number()
        .positive('Pass marks must be a positive number')
        .max(1000, 'Pass marks cannot exceed 1000')
        .optional(),
      examDate: z.string().regex(dateRegex, 'Exam date must be in YYYY-MM-DD format').optional(),
      status: z.nativeEnum(ExamStatus, { error: 'Invalid exam status' }).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field must be provided for update',
    })
    .refine(
      (data) => {
        if (data.passMarks !== undefined && data.totalMarks !== undefined) {
          return data.passMarks <= data.totalMarks;
        }
        return true;
      },
      {
        message: 'Pass marks cannot be greater than total marks',
        path: ['passMarks'],
      },
    ),
});

export const bulkMarksEntrySchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid exam ID format'),
  }),
  body: z.object({
    records: z
      .array(
        z.object({
          studentId: z.string().uuid('Invalid student ID format'),
          marksObtained: z
            .number({
              error: 'Marks obtained is required',
            })
            .min(0, 'Marks obtained cannot be negative')
            .max(1000, 'Marks obtained cannot exceed 1000'),
          grade: z.string().trim().max(10, 'Grade cannot exceed 10 characters').optional(),
          remarks: z.string().trim().max(255, 'Remarks cannot exceed 255 characters').optional(),
        }),
      )
      .min(1, 'At least one student marks record must be provided'),
  }),
});

export const updateStudentMarkSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid exam ID format'),
    studentId: z.string().uuid('Invalid student ID format'),
  }),
  body: z.object({
    marksObtained: z
      .number({
        error: 'Marks obtained is required',
      })
      .min(0, 'Marks obtained cannot be negative')
      .max(1000, 'Marks obtained cannot exceed 1000'),
    grade: z.string().trim().max(10, 'Grade cannot exceed 10 characters').optional(),
    remarks: z.string().trim().max(255, 'Remarks cannot exceed 255 characters').optional(),
  }),
});

export const examIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid exam ID format'),
  }),
});

export const getExamsQuerySchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/, 'Page must be a positive integer').transform(Number).optional(),
    limit: z
      .string()
      .regex(/^\d+$/, 'Limit must be a positive integer')
      .transform(Number)
      .optional(),
    search: z.string().trim().optional(),
    batchId: z.string().uuid('Invalid batch ID format').optional(),
    status: z.nativeEnum(ExamStatus, { error: 'Invalid exam status' }).optional(),
    resultStatus: z.nativeEnum(ResultStatus, { error: 'Invalid result status' }).optional(),
    examDate: z.string().regex(dateRegex, 'examDate must be in YYYY-MM-DD format').optional(),
    startDate: z.string().regex(dateRegex, 'startDate must be in YYYY-MM-DD format').optional(),
    endDate: z.string().regex(dateRegex, 'endDate must be in YYYY-MM-DD format').optional(),
    sortBy: z.string().trim().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
});

export const getStudentReportsQuerySchema = z.object({
  params: z
    .object({
      studentId: z.string().uuid('Invalid student ID format').optional(),
    })
    .optional(),
  query: z.object({
    page: z.string().regex(/^\d+$/, 'Page must be a positive integer').transform(Number).optional(),
    limit: z
      .string()
      .regex(/^\d+$/, 'Limit must be a positive integer')
      .transform(Number)
      .optional(),
    batchId: z.string().uuid('Invalid batch ID format').optional(),
    sortBy: z.string().trim().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
});
