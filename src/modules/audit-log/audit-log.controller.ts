import type { Request, Response } from 'express';
import { catchAsync, sendResponse } from '../../utils';
import { auditLogService } from './services';

export const getAllAuditLogs = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const result = await auditLogService.getAllAuditLogs(req.query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Audit logs retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

export const getAuditStats = catchAsync(async (_req: Request, res: Response): Promise<void> => {
  const data = await auditLogService.getAuditStats();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Audit log statistics retrieved successfully',
    data,
  });
});

export const getAuditLogById = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const auditLogId = req.params.auditLogId as string;
  const data = await auditLogService.getAuditLogById(auditLogId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Audit log details retrieved successfully',
    data,
  });
});

export const auditLogController = Object.freeze({
  getAllAuditLogs,
  getAuditStats,
  getAuditLogById,
});
