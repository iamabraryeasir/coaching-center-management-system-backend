import { AttendanceStatus } from '@prisma/client';
import { z } from 'zod';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const markBulkAttendanceSchema = z.object({
  params: z.object({
    batchId: z.string().uuid('Invalid batch ID format'),
  }),
  body: z.object({
    date: z
      .string({
        error: 'Attendance date is required',
      })
      .regex(dateRegex, 'Date must be in YYYY-MM-DD format'),
    records: z
      .array(
        z.object({
          studentId: z.string().uuid('Invalid student ID format'),
          status: z.nativeEnum(AttendanceStatus, {
            error: 'Invalid attendance status',
          }),
          remarks: z.string().trim().max(255, 'Remarks cannot exceed 255 characters').optional(),
        }),
      )
      .min(1, 'At least one student attendance record must be provided'),
  }),
});

export const updateAttendanceSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid attendance record ID format'),
  }),
  body: z.object({
    status: z.nativeEnum(AttendanceStatus, {
      error: 'Invalid attendance status',
    }),
    remarks: z.string().trim().max(255, 'Remarks cannot exceed 255 characters').optional(),
  }),
});

export const attendanceIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid attendance record ID format'),
  }),
});

export const attendanceBatchIdParamSchema = z.object({
  params: z.object({
    batchId: z.string().uuid('Invalid batch ID format'),
  }),
});

export const attendanceStudentIdParamSchema = z.object({
  params: z.object({
    studentId: z.string().uuid('Invalid student ID format'),
  }),
});

export const getBatchAttendanceQuerySchema = z.object({
  params: z.object({
    batchId: z.string().uuid('Invalid batch ID format'),
  }),
  query: z.object({
    page: z.string().regex(/^\d+$/, 'Page must be a positive integer').transform(Number).optional(),
    limit: z
      .string()
      .regex(/^\d+$/, 'Limit must be a positive integer')
      .transform(Number)
      .optional(),
    search: z.string().trim().optional(),
    date: z.string().regex(dateRegex, 'Date must be in YYYY-MM-DD format').optional(),
    startDate: z.string().regex(dateRegex, 'startDate must be in YYYY-MM-DD format').optional(),
    endDate: z.string().regex(dateRegex, 'endDate must be in YYYY-MM-DD format').optional(),
    status: z.nativeEnum(AttendanceStatus, { error: 'Invalid attendance status' }).optional(),
    sortBy: z.string().trim().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
});

export const getStudentAttendanceQuerySchema = z.object({
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
    startDate: z.string().regex(dateRegex, 'startDate must be in YYYY-MM-DD format').optional(),
    endDate: z.string().regex(dateRegex, 'endDate must be in YYYY-MM-DD format').optional(),
    status: z.nativeEnum(AttendanceStatus, { error: 'Invalid attendance status' }).optional(),
    sortBy: z.string().trim().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
});

export const markBulkTeacherAttendanceSchema = z.object({
  body: z.object({
    date: z
      .string({
        error: 'Attendance date is required',
      })
      .regex(dateRegex, 'Date must be in YYYY-MM-DD format'),
    records: z
      .array(
        z.object({
          teacherId: z.string().uuid('Invalid teacher ID format'),
          status: z.nativeEnum(AttendanceStatus, {
            error: 'Invalid attendance status',
          }),
          remarks: z.string().trim().max(255, 'Remarks cannot exceed 255 characters').optional(),
        }),
      )
      .min(1, 'At least one teacher attendance record must be provided'),
  }),
});

export const selfCheckInTeacherAttendanceSchema = z.object({
  body: z
    .object({
      remarks: z.string().trim().max(255, 'Remarks cannot exceed 255 characters').optional(),
    })
    .optional(),
});

export const updateTeacherAttendanceSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid teacher attendance record ID format'),
  }),
  body: z.object({
    status: z.nativeEnum(AttendanceStatus, {
      error: 'Invalid attendance status',
    }),
    remarks: z.string().trim().max(255, 'Remarks cannot exceed 255 characters').optional(),
  }),
});

export const teacherAttendanceIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid teacher attendance record ID format'),
  }),
});

export const getTeacherAttendanceQuerySchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/, 'Page must be a positive integer').transform(Number).optional(),
    limit: z
      .string()
      .regex(/^\d+$/, 'Limit must be a positive integer')
      .transform(Number)
      .optional(),
    search: z.string().trim().optional(),
    teacherId: z.string().uuid('Invalid teacher ID format').optional(),
    date: z.string().regex(dateRegex, 'Date must be in YYYY-MM-DD format').optional(),
    startDate: z.string().regex(dateRegex, 'startDate must be in YYYY-MM-DD format').optional(),
    endDate: z.string().regex(dateRegex, 'endDate must be in YYYY-MM-DD format').optional(),
    status: z.nativeEnum(AttendanceStatus, { error: 'Invalid attendance status' }).optional(),
    sortBy: z.string().trim().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
});

export const getTeacherAttendanceSummaryQuerySchema = z.object({
  params: z
    .object({
      teacherId: z.string().uuid('Invalid teacher ID format').optional(),
    })
    .optional(),
  query: z.object({
    page: z.string().regex(/^\d+$/, 'Page must be a positive integer').transform(Number).optional(),
    limit: z
      .string()
      .regex(/^\d+$/, 'Limit must be a positive integer')
      .transform(Number)
      .optional(),
    startDate: z.string().regex(dateRegex, 'startDate must be in YYYY-MM-DD format').optional(),
    endDate: z.string().regex(dateRegex, 'endDate must be in YYYY-MM-DD format').optional(),
    status: z.nativeEnum(AttendanceStatus, { error: 'Invalid attendance status' }).optional(),
    sortBy: z.string().trim().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
});
