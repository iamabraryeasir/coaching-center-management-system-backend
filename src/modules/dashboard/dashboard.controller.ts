import { Role } from '@prisma/client';
import type { Request, Response } from 'express';
import { ApiError, catchAsync, sendResponse } from '../../utils';
import type { IMonthlySummaryQuery, IStudentDashboardQuery } from './dashboard.interface';
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

export const getStudentDashboardController = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    let studentId = req.user?.userId;

    if (req.user?.role === Role.ADMIN) {
      const query = req.query as unknown as IStudentDashboardQuery;
      if (query.studentId) {
        studentId = query.studentId;
      }
    }

    if (!studentId) {
      throw ApiError.badRequest('Student ID is required.');
    }

    const data = await dashboardServices.getStudentDashboard(studentId);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Student dashboard summary retrieved successfully',
      data,
    });
  },
);
