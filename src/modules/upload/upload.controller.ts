import type { Request, Response } from 'express';
import { catchAsync, sendResponse } from '../../utils';
import { uploadService } from './services';

export const uploadMyAvatar = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.userId as string;

  const result = await uploadService.uploadUserAvatar(userId, req.file);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: result.message,
    data: result,
  });
});

export const deleteMyAvatar = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.userId as string;

  const result = await uploadService.deleteUserAvatar(userId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: result.message,
    data: result,
  });
});

export const uploadUserAvatarById = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.params.userId as string;

    const result = await uploadService.uploadUserAvatar(userId, req.file);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: result.message,
      data: result,
    });
  },
);

export const uploadController = Object.freeze({
  uploadMyAvatar,
  deleteMyAvatar,
  uploadUserAvatarById,
});
