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
 * Registers a new student under the institution (ADMIN only)
 */
export const registerStudent = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const metadata = extractClientMetadata(req);

  if (!req.user || req.user.role !== Role.ADMIN) {
    throw ApiError.forbidden('Only administrators can register students');
  }

  const result = await authService.registerStudentAccount(req.body, metadata);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Student registered successfully',
    data: result.user,
  });
});

/**
 * Registers a new teacher with profile and permissions under the institution (ADMIN only)
 */
export const registerTeacher = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const metadata = extractClientMetadata(req);

  if (!req.user || req.user.role !== Role.ADMIN) {
    throw ApiError.forbidden('Only administrators can register teachers');
  }

  const result = await authService.registerTeacherAccount(req.body, metadata);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Teacher registered successfully',
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

/**
 * Authenticates student via Google Identity Services (GIS) ID Token
 * Returns active session tokens if approved, or prompts for onboarding if new user
 */
export const googleLogin = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const metadata = extractClientMetadata(req);
  const result = await authService.loginWithGoogle(req.body, metadata);

  if (result.isNewUser) {
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Google authentication verified. Student onboarding required.',
      data: result,
    });
    return;
  }

  // Set HttpOnly cookies for Web clients
  res.cookie('accessToken', result.tokens.accessToken, getAccessTokenCookieOptions());
  res.cookie('refreshToken', result.tokens.refreshToken, getRefreshTokenCookieOptions());

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Logged in successfully with Google',
    data: {
      user: result.user,
      tokens: result.tokens,
    },
  });
});

/**
 * Onboards a new Google-authenticated student into PENDING_ACTIVATION state
 */
export const googleOnboard = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const metadata = extractClientMetadata(req);
  const result = await authService.onboardGoogleStudent(req.body, metadata);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: result.message,
    data: result.user,
  });
});

/**
 * Retrieves paginated list of pending Google onboarding students (ADMIN only)
 */
export const getPendingStudents = catchAsync(async (req: Request, res: Response): Promise<void> => {
  if (!req.user || req.user.role !== Role.ADMIN) {
    throw ApiError.forbidden('Only administrators can view pending student applications');
  }

  const result = await authService.getPendingStudents(req.query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Pending student applications retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

/**
 * Approves a pending student application (ADMIN only)
 */
export const approveStudent = catchAsync(async (req: Request, res: Response): Promise<void> => {
  if (!req.user || req.user.role !== Role.ADMIN) {
    throw ApiError.forbidden('Only administrators can approve student applications');
  }

  const student = await authService.approveStudent(req.params.id as string, req.user.email);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Student application approved and activated successfully',
    data: student,
  });
});

/**
 * Rejects a pending student application (ADMIN only)
 */
export const rejectStudent = catchAsync(async (req: Request, res: Response): Promise<void> => {
  if (!req.user || req.user.role !== Role.ADMIN) {
    throw ApiError.forbidden('Only administrators can reject student applications');
  }

  const result = await authService.rejectStudent(req.params.id as string, req.user.email);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: result.message,
  });
});
