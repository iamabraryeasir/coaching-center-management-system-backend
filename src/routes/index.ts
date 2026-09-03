import { Router } from 'express';
import { sendResponse } from '../utils';

const rootRouter: Router = Router();

rootRouter.get('/health', (_req, res) => {
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Coaching Management System API v1 is operating normally',
    data: {
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    },
  });
});

export { rootRouter };
