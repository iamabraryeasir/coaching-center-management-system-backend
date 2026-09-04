import { Role } from '@prisma/client';
import type { Request, Response } from 'express';
import { config } from '../../config';
import { ApiError, catchAsync, sendResponse } from '../../utils';
import {
  extractClientMetadata,
  getAccessTokenCookieOptions,
  getRefreshTokenCookieOptions,
} from './auth.utils';
import { authService } from './services';

/**
 * Registers a new student under the authenticated branch Admin (ADMIN only)
 */
export const registerStudent = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const metadata = extractClientMetadata(req);

  // Strictly enforce that only branch ADMIN can register students (SUPER_ADMIN cannot register students)
  if (!req.user || req.user.role !== Role.ADMIN) {
    throw ApiError.forbidden('Only branch administrators can register students');
  }

  const result = await authService.registerStudentAccount(
    {
      ...req.body,
      adminId: req.user.userId,
    },
    metadata,
  );

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Student registered successfully',
    data: result.user,
  });
});

/**
 * Authenticates user across Web and React Native mobile clients
 */
export const login = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const metadata = extractClientMetadata(req);
  const result = await authService.loginUser(req.body, metadata);

  // Set HttpOnly cookies for Web browsers (both access token and rotating refresh token)
  res.cookie('accessToken', result.tokens.accessToken, getAccessTokenCookieOptions());
  res.cookie('refreshToken', result.tokens.refreshToken, getRefreshTokenCookieOptions());

  // Return full tokens payload in body for React Native mobile apps (Keychain / SecureStore)
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Logged in successfully',
    data: {
      user: result.user,
      tokens: result.tokens,
    },
  });
});

/**
 * Rotates refresh token and issues fresh access token
 */
export const refreshToken = catchAsync(async (req: Request, res: Response): Promise<void> => {
  // 1. Primary for Web browsers: automatically sent via HttpOnly cookie
  // 2. Fallback for React Native mobile apps: body or custom header
  const token =
    req.cookies?.refreshToken ||
    req.body?.refreshToken ||
    (req.headers['x-refresh-token'] as string | undefined);

  if (!token) {
    throw ApiError.unauthorized(
      'Refresh token is required via cookie, request body, or x-refresh-token header',
    );
  }

  const metadata = extractClientMetadata(req);
  const result = await authService.refreshUserTokens({ refreshToken: token }, metadata);

  // Update cookies for Web browsers
  res.cookie('accessToken', result.tokens.accessToken, getAccessTokenCookieOptions());
  res.cookie('refreshToken', result.tokens.refreshToken, getRefreshTokenCookieOptions());

  // Return new token pair to client (for React Native mobile clients)
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Access token refreshed successfully',
    data: {
      tokens: result.tokens,
    },
  });
});

/**
 * Terminates active session on current device or across all devices
 */
export const logout = catchAsync(async (req: Request, res: Response): Promise<void> => {
  // 1. Primary for Web browsers: automatically sent via HttpOnly cookie
  // 2. Fallback for React Native mobile apps: body or custom header
  const token =
    req.cookies?.refreshToken ||
    req.body?.refreshToken ||
    (req.headers['x-refresh-token'] as string | undefined);

  const allDevices = Boolean(req.body?.allDevices);
  const metadata = extractClientMetadata(req);

  if (token) {
    await authService.logoutUser({ refreshToken: token, allDevices }, metadata);
  }

  // Clear both tokens from Web browser cookies
  res.clearCookie('accessToken', {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: config.NODE_ENV === 'production' ? 'none' : 'lax',
  });
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: config.NODE_ENV === 'production' ? 'none' : 'lax',
  });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: allDevices ? 'Logged out successfully from all devices' : 'Logged out successfully',
    data: null,
  });
});

/**
 * Initiates password recovery by emailing a single-use reset link
 */
export const forgotPassword = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const metadata = extractClientMetadata(req);
  const result = await authService.requestPasswordReset(req.body, metadata);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: result.message,
    data: null,
  });
});

/**
 * Completes password recovery using a verified reset token
 */
export const resetPassword = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const metadata = extractClientMetadata(req);
  const result = await authService.resetUserPassword(req.body, metadata);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: result.message,
    data: null,
  });
});
