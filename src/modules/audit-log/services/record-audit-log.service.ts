import { prisma } from '../../../config';
import { logger } from '../../../utils';
import type { IRecordAuditLogInput } from '../audit-log.interface';

export const recordAuditLogService = async (input: IRecordAuditLogInput): Promise<void> => {
  try {
    const detailsString = input.details ? JSON.stringify(input.details) : null;

    await prisma.auditLog.create({
      data: {
        userId: input.userId || null,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        details: detailsString,
        ipAddress: input.ipAddress || null,
        userAgent: input.userAgent || null,
      },
    });
  } catch (error) {
    // Non-blocking: log the failure without disrupting parent transactions
    logger.error('Failed to persist AuditLog to database:', error);
  }
};
