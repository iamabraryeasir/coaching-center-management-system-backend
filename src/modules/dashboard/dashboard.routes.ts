import { Role } from '@prisma/client';
import { Router } from 'express';
import { checkAuth, validateRequest } from '../../middlewares';
import {
  getMonthlySummaryController,
  getTodayDashboardController,
} from './dashboard.controller';
import { getMonthlySummaryQuerySchema } from './dashboard.validation';

const dashboardRouter: Router = Router();

// Today Real-Time Snapshot
dashboardRouter.get('/today', checkAuth(Role.ADMIN), getTodayDashboardController);

// Monthly Financial & Academic Summary
dashboardRouter.get(
  '/monthly-summary',
  checkAuth(Role.ADMIN),
  validateRequest(getMonthlySummaryQuerySchema),
  getMonthlySummaryController,
);

export { dashboardRouter };

