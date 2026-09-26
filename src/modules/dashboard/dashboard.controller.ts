import type { Request, Response } from 'express';
import { catchAsync, sendResponse } from '../../utils';
import type { IMonthlySummaryQuery } from './dashboard.interface';
import { dashboardServices } from './services';

export const getTodayDashboardController = catchAsync(
  async (_req: Request, res: Response): Promise<void> => {
    const data = await dashboardServices.getTodayDashboard();

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Today's dashboard snapshot fetched successfully",
      data,
    });
  },
);

export const getMonthlySummaryController = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const data = await dashboardServices.getMonthlySummary(
      req.query as unknown as IMonthlySummaryQuery,
    );

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Monthly summary fetched successfully',
      data,
    });
  },
);
