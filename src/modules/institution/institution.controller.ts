import type { Request, Response } from 'express';
import { catchAsync, sendResponse } from '../../utils';
import { institutionService } from './services';

export const getInstitution = catchAsync(async (_req: Request, res: Response): Promise<void> => {
  const result = await institutionService.getInstitution();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Institution profile retrieved successfully',
    data: result,
  });
});

export const updateInstitution = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const result = await institutionService.updateInstitution(req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Institution profile updated successfully',
    data: result,
  });
});
