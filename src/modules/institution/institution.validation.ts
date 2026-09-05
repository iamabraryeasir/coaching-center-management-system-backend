import { z } from 'zod';

export const updateInstitutionSchema = z.object({
  body: z
    .object({
      institutionName: z
        .string()
        .trim()
        .min(2, 'Institution name must be at least 2 characters')
        .optional(),
      institutionAddress: z
        .string()
        .trim()
        .min(3, 'Institution address must be at least 3 characters')
        .optional(),
      institutionPhone: z
        .string()
        .regex(/^\+?[1-9]\d{7,14}$/, 'Invalid phone number format')
        .optional()
        .nullable(),
      institutionEmail: z.string().email('Invalid email address').optional().nullable(),
      adminName: z.string().trim().min(2, 'Admin name must be at least 2 characters').optional(),
      adminPhone: z
        .string()
        .regex(/^\+?[1-9]\d{7,14}$/, 'Invalid phone number format')
        .optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field must be provided to update institution',
    }),
});

export type UpdateInstitutionInput = z.infer<typeof updateInstitutionSchema>['body'];
