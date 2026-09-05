import { Role } from '@prisma/client';
import { Router } from 'express';
import { checkAuth, validateRequest } from '../../middlewares';
import { auditLogController } from './audit-log.controller';
import { auditLogIdParamSchema, getAuditLogsQuerySchema } from './audit-log.validation';

const router = Router();

// Strict Admin-Only Security Access for all Audit Logging endpoints
router.use(checkAuth(Role.ADMIN));

/**
 * Audit Log Statistics & Dashboard Metrics (Admin Only)
 */
router.get('/stats', auditLogController.getAuditStats);

/**
 * Single Audit Log Entry Lookup (Admin Only)
 */
router.get(
  '/:auditLogId',
  validateRequest(auditLogIdParamSchema),
  auditLogController.getAuditLogById,
);

/**
 * Universal Audit Trail Query Explorer (Admin Only)
 */
router.get('/', validateRequest(getAuditLogsQuerySchema), auditLogController.getAllAuditLogs);

export const auditLogRouter: Router = router;
