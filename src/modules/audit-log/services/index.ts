import { getAllAuditLogsService } from './get-all-audit-logs.service';
import { getAuditLogByIdService } from './get-audit-log-by-id.service';
import { getAuditStatsService } from './get-audit-stats.service';
import { recordAuditLogService } from './record-audit-log.service';

export const auditLogService = Object.freeze({
  getAllAuditLogs: getAllAuditLogsService,
  getAuditLogById: getAuditLogByIdService,
  getAuditStats: getAuditStatsService,
  recordAuditLog: recordAuditLogService,
});

export {
  getAllAuditLogsService,
  getAuditLogByIdService,
  getAuditStatsService,
  recordAuditLogService,
};
