import type { Request, Response } from 'express';
import { ApiError, catchAsync, sendResponse } from '../../utils';
import { userService } from './services';

export const getMyProfile = catchAsync(async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    throw ApiError.unauthorized('Authentication required');
  }

  const profile = await userService.getMyProfile(req.user.userId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'User profile retrieved successfully',
    data: profile,
  });
});

export const updateMyProfile = catchAsync(async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    throw ApiError.unauthorized('Authentication required');
  }

  const profile = await userService.updateMyProfile(req.user.userId, req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'User profile updated successfully',
    data: profile,
  });
});

export const changePassword = catchAsync(async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    throw ApiError.unauthorized('Authentication required');
  }

  const result = await userService.changePassword(req.user.userId, req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: result.message,
    data: null,
  });
});

export const getAllUsers = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const result = await userService.getAllUsers(req.query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Users retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

export const getUserById = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const user = await userService.getUserById(req.params.id as string);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'User details retrieved successfully',
    data: user,
  });
});

export const updateUserStatus = catchAsync(async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    throw ApiError.unauthorized('Authentication required');
  }

  const user = await userService.updateUserStatus(
    req.params.id as string,
    req.user.userId,
    req.body,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'User status updated successfully',
    data: user,
  });
});

export const deleteUser = catchAsync(async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    throw ApiError.unauthorized('Authentication required');
  }

  const result = await userService.deleteUser(req.params.id as string, req.user.userId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: result.message,
    data: null,
  });
});

export const updateTeacherPermissions = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      throw ApiError.unauthorized('Authentication required');
    }

    const teacher = await userService.updateTeacherPermissions(
      req.params.id as string,
      req.user.userId,
      req.body,
    );

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Teacher operational permissions updated successfully',
      data: teacher,
    });
  },
);
