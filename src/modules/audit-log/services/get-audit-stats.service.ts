import { startOfDay } from 'date-fns';
import { prisma } from '../../../config';
import type {
  IAuditActionBreakdown,
  IAuditEntityBreakdown,
  IAuditStatsResponse,
} from '../audit-log.interface';

export const getAuditStatsService = async (): Promise<IAuditStatsResponse> => {
  const todayStart = startOfDay(new Date());

  const [totalLogs, todayLogs, actionGroups, entityGroups] = await Promise.all([
    prisma.auditLog.count(),
    prisma.auditLog.count({
      where: {
        createdAt: {
          gte: todayStart,
        },
      },
    }),
    prisma.auditLog.groupBy({
      by: ['action'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    }),
    prisma.auditLog.groupBy({
      by: ['entity'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    }),
  ]);

  const topActions: IAuditActionBreakdown[] = actionGroups.map((g) => ({
    action: g.action,
    count: g._count.id,
  }));

  const topEntities: IAuditEntityBreakdown[] = entityGroups.map((g) => ({
    entity: g.entity,
    count: g._count.id,
  }));

  return {
    totalLogs,
    todayLogs,
    topActions,
    topEntities,
  };
};
