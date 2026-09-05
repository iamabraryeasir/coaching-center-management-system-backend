import type { Role } from '@prisma/client';

export interface IAuditLogUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface IAuditLogResponse {
  id: string;
  userId: string | null;
  action: string;
  entity: string;
  entityId: string;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
  user?: IAuditLogUser | null;
}

export interface IRecordAuditLogInput {
  userId?: string | null;
  action: string;
  entity: string;
  entityId: string;
  details?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface IAuditActionBreakdown {
  action: string;
  count: number;
}

export interface IAuditEntityBreakdown {
  entity: string;
  count: number;
}

export interface IAuditStatsResponse {
  totalLogs: number;
  todayLogs: number;
  topActions: IAuditActionBreakdown[];
  topEntities: IAuditEntityBreakdown[];
}
