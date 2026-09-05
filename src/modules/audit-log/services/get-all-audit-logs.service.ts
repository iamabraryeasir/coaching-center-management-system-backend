import { prisma } from '../../../config';
import { QueryBuilder } from '../../../utils';
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

export const getAllAuditLogsService = async (query: Record<string, unknown>) => {
  const queryBuilder = new QueryBuilder(query)
    .search(['action', 'entity', 'entityId', 'user.name', 'user.email'])
    .filter({
      exclude: ['searchTerm', 'page', 'limit', 'sortBy', 'sortOrder'],
    })
    .sort('createdAt', 'desc')
    .paginate(1, 20, 100);

  const prismaQuery = queryBuilder.build();

  const [logs, totalCount] = await Promise.all([
    prisma.auditLog.findMany({
      ...prismaQuery,
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
    }),
    prisma.auditLog.count({ where: prismaQuery.where }),
  ]);

  const formattedLogs: IAuditLogResponse[] = logs.map((log) => ({
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
  }));

  return {
    meta: queryBuilder.getPaginationMeta(totalCount),
    data: formattedLogs,
  };
};
