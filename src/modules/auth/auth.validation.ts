import { z } from 'zod';

export const registerStudentSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters'),
    email: z.string().trim().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    phone: z.string().trim().min(10, 'Phone must be at least 10 digits'),
    adminId: z.string().uuid('Invalid branch Admin ID').optional(),
    guardianName: z.string().trim().min(2, 'Guardian name must be at least 2 characters'),
    guardianPhone: z.string().trim().min(10, 'Guardian phone must be at least 10 digits'),
    institutionName: z.string().trim().optional(),
    classLevel: z.string().trim().min(1, 'Class level is required'),
    rollNumber: z.string().trim().optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().trim().email('Invalid email address'),
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
    email: z.string().trim().email('Please provide a valid email address'),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().trim().min(32, 'Valid reset token is required'),
    newPassword: z.string().min(6, 'Password must be at least 6 characters'),
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
    email: z.string().trim().email('Invalid email address'),
    name: z.string().trim().min(2, 'Name must be at least 2 characters'),
    phone: z.string().trim().min(10, 'Phone must be at least 10 digits'),
    adminId: z.string().uuid('Invalid branch Admin ID'),
    guardianName: z.string().trim().min(2, 'Guardian name must be at least 2 characters'),
    guardianPhone: z.string().trim().min(10, 'Guardian phone must be at least 10 digits'),
    institutionName: z.string().trim().optional(),
    classLevel: z.string().trim().min(1, 'Class level is required'),
    rollNumber: z.string().trim().optional(),
    avatarUrl: z.string().url('Invalid avatar URL').optional(),
  }),
});
