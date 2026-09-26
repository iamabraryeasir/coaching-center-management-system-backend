import { getMonthlySummary } from './get-monthly-summary.service';
import { getTodayDashboard } from './get-today-dashboard.service';

export * from './get-monthly-summary.service';
export * from './get-today-dashboard.service';

export const dashboardServices = Object.freeze({
  getTodayDashboard,
  getMonthlySummary,
});
