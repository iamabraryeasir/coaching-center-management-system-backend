import { Permission } from '@prisma/client';
import { z } from 'zod';

export const strongPasswordSchema = z
  .string({
    error: 'Password is required',
  })
  .min(8, 'Password must be at least 8 characters long')
  .max(128, 'Password cannot exceed 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one digit (number)')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

export const registerStudentSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters'),
    email: z.email('Invalid email address'),
    password: strongPasswordSchema,
    phone: z.string().trim().min(10, 'Phone must be at least 10 digits'),
    guardianName: z.string().trim().min(2, 'Guardian name must be at least 2 characters'),
    guardianPhone: z.string().trim().min(10, 'Guardian phone must be at least 10 digits'),
    institutionName: z.string().trim().optional(),
    classLevel: z.string().trim().min(1, 'Class level is required'),
    rollNumber: z.string().trim().optional(),
  }),
});

export const registerTeacherSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters'),
    email: z.email('Invalid email address'),
    password: strongPasswordSchema,
    phone: z.string().trim().min(10, 'Phone must be at least 10 digits'),
    designation: z.string().trim().min(2, 'Designation must be at least 2 characters'),
    qualification: z.string().trim().min(2, 'Qualification must be at least 2 characters'),
    specialization: z.string().trim().min(2, 'Specialization must be at least 2 characters'),
    joiningDate: z.string().datetime().optional(),
    permissions: z.array(z.enum(Permission)).optional().default([]),
  }),
});

export const getPendingStudentsSchema = z.object({
  query: z
    .object({
      search: z.string().trim().optional(),
      searchTerm: z.string().trim().optional(),
      page: z.string().regex(/^\d+$/).optional(),
      limit: z.string().regex(/^\d+$/).optional(),
      sortBy: z.string().trim().optional(),
      sortOrder: z.enum(['asc', 'desc']).optional(),
    })
    .optional(),
});

export const studentIdParamSchema = z.object({
  params: z.object({
    id: z.uuid('Valid student ID is required'),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
  }),
  headers: z
    .object({
      'x-device-name': z.string().trim().max(100).optional(),
      'x-platform': z.enum(['ios', 'android', 'web']).optional(),
    })
    .passthrough()
    .optional(),
});

export const refreshTokenSchema = z
  .object({
    body: z
      .object({
        refreshToken: z.string().min(10).optional(),
      })
      .optional(),
    cookies: z
      .object({
        refreshToken: z.string().min(10).optional(),
      })
      .optional(),
    headers: z
      .object({
        'x-refresh-token': z.string().min(10).optional(),
        'x-device-name': z.string().trim().max(100).optional(),
        'x-platform': z.enum(['ios', 'android', 'web']).optional(),
      })
      .passthrough()
      .optional(),
  })
  .refine(
    (data) =>
      Boolean(
        data.cookies?.refreshToken || data.body?.refreshToken || data.headers?.['x-refresh-token'],
      ),
    {
      message:
        'Refresh token is required via cookie (refreshToken), request body, or x-refresh-token header',
      path: ['refreshToken'],
    },
  );

export const logoutSchema = z.object({
  body: z
    .object({
      refreshToken: z.string().min(10).optional(),
      allDevices: z.boolean().optional().default(false),
    })
    .optional(),
  cookies: z
    .object({
      refreshToken: z.string().min(10).optional(),
    })
    .optional(),
  headers: z
    .object({
      'x-refresh-token': z.string().min(10).optional(),
    })
    .passthrough()
    .optional(),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.email('Please provide a valid email address'),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().trim().min(32, 'Valid reset token is required'),
    newPassword: strongPasswordSchema,
  }),
});

export const googleLoginSchema = z.object({
  body: z.object({
    idToken: z.string().min(1, 'Google ID token is required'),
  }),
  headers: z
    .object({
      'x-device-name': z.string().trim().max(100).optional(),
      'x-platform': z.enum(['ios', 'android', 'web']).optional(),
    })
    .passthrough()
    .optional(),
});

export const googleOnboardSchema = z.object({
  body: z.object({
    googleId: z.string().min(1, 'Google ID is required'),
    email: z.email('Invalid email address'),
    name: z.string().trim().min(2, 'Name must be at least 2 characters'),
    phone: z.string().trim().min(10, 'Phone must be at least 10 digits'),
    guardianName: z.string().trim().min(2, 'Guardian name must be at least 2 characters'),
    guardianPhone: z.string().trim().min(10, 'Guardian phone must be at least 10 digits'),
    institutionName: z.string().trim().optional(),
    classLevel: z.string().trim().min(1, 'Class level is required'),
    rollNumber: z.string().trim().optional(),
    avatarUrl: z.string().url('Invalid avatar URL').optional(),
  }),
});
