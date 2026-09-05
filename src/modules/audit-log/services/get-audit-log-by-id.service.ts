import { prisma } from '../../../config';
import { ApiError } from '../../../utils';
import type { IAuditLogResponse } from '../audit-log.interface';

const safeJsonParse = (str: string | null): Record<string, unknown> | null => {
  if (!str) {
    return null;
  }
  try {
    return JSON.parse(str);
  } catch {
    return { raw: str };
  }
};

export const getAuditLogByIdService = async (auditLogId: string): Promise<IAuditLogResponse> => {
  const log = await prisma.auditLog.findUnique({
    where: { id: auditLogId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });

  if (!log) {
    throw ApiError.notFound('Audit log record not found');
  }

  return {
    id: log.id,
    userId: log.userId,
    action: log.action,
    entity: log.entity,
    entityId: log.entityId,
    details: safeJsonParse(log.details),
    ipAddress: log.ipAddress,
    userAgent: log.userAgent,
    createdAt: log.createdAt,
    user: log.user,
  };
};
