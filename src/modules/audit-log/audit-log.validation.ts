import { z } from 'zod';

export const getAuditLogsQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    sortBy: z.string().default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
    searchTerm: z.string().optional(),
    action: z.string().trim().optional(),
    entity: z.string().trim().optional(),
    userId: z.string().uuid('Invalid user ID format').optional(),
    entityId: z.string().optional(),
  }),
});

export const auditLogIdParamSchema = z.object({
  params: z.object({
    auditLogId: z.string().uuid('Invalid audit log ID format'),
  }),
});
