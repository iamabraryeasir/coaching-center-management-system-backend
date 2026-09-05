import { Role, UserStatus } from '@prisma/client';
import { z } from 'zod';

export const updateMyProfileSchema = z.object({
  body: z
    .object({
      name: z.string().trim().min(2, 'Name must be at least 2 characters').optional(),
      phone: z
        .string()
        .regex(/^\+?[1-9]\d{7,14}$/, 'Invalid phone number format')
        .optional(),
      avatarUrl: z.string().url('Invalid avatar URL format').optional().nullable(),
      // Student Profile updates
      guardianName: z
        .string()
        .trim()
        .min(2, 'Guardian name must be at least 2 characters')
        .optional(),
      guardianPhone: z
        .string()
        .trim()
        .min(10, 'Guardian phone must be at least 10 digits')
        .optional(),
      institutionName: z.string().trim().optional().nullable(),
      classLevel: z.string().trim().min(1, 'Class level cannot be empty').optional(),
      rollNumber: z.string().trim().optional().nullable(),
      // Teacher Profile updates
      designation: z.string().trim().min(2, 'Designation must be at least 2 characters').optional(),
      qualification: z
        .string()
        .trim()
        .min(2, 'Qualification must be at least 2 characters')
        .optional(),
      specialization: z
        .string()
        .trim()
        .min(2, 'Specialization must be at least 2 characters')
        .optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field must be provided to update profile',
    }),
});

export const changePasswordSchema = z.object({
  body: z
    .object({
      currentPassword: z.string().min(1, 'Current password is required'),
      newPassword: z.string().min(6, 'New password must be at least 6 characters'),
    })
    .refine((data) => data.currentPassword !== data.newPassword, {
      message: 'New password must be different from current password',
      path: ['newPassword'],
    }),
});

export const getUsersQuerySchema = z.object({
  query: z
    .object({
      search: z.string().trim().optional(),
      searchTerm: z.string().trim().optional(),
      role: z.enum(Role).optional(),
      status: z.enum(UserStatus).optional(),
      page: z.string().regex(/^\d+$/).optional(),
      limit: z.string().regex(/^\d+$/).optional(),
      sortBy: z.string().trim().optional(),
      sortOrder: z.enum(['asc', 'desc']).optional(),
    })
    .optional(),
});

export const userIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Valid user ID is required'),
  }),
});

export const updateUserStatusSchema = z.object({
  params: z.object({
    id: z.string().uuid('Valid user ID is required'),
  }),
  body: z.object({
    status: z.enum(UserStatus, {
      message: 'Status must be ACTIVE, INACTIVE, BLOCKED, or PENDING_ACTIVATION',
    }),
    reason: z.string().trim().max(500, 'Reason cannot exceed 500 characters').optional(),
  }),
});

export type UpdateMyProfileInput = z.infer<typeof updateMyProfileSchema>['body'];
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>['body'];
export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>['body'];
