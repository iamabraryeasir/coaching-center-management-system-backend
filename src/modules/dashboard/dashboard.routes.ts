import { Role } from '@prisma/client';
import { Router } from 'express';
import { checkAuth, validateRequest } from '../../middlewares';
import {
  getMonthlySummaryController,
  getStudentDashboardController,
  getTeacherDashboardController,
  getTodayDashboardController,
} from './dashboard.controller';
import {
  getMonthlySummaryQuerySchema,
  getStudentDashboardQuerySchema,
  getTeacherDashboardQuerySchema,
} from './dashboard.validation';

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

// Student Personalized Dashboard Snapshot
dashboardRouter.get(
  '/student',
  checkAuth(Role.STUDENT, Role.ADMIN),
  validateRequest(getStudentDashboardQuerySchema),
  getStudentDashboardController,
);

// Teacher Personalized Dashboard Snapshot
dashboardRouter.get(
  '/teacher',
  checkAuth(Role.TEACHER, Role.ADMIN),
  validateRequest(getTeacherDashboardQuerySchema),
  getTeacherDashboardController,
);

export { dashboardRouter };
