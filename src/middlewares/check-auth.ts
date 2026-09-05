import { type Role, UserStatus } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../config';
import { ApiError, verifyAccessToken } from '../utils';

/**
 * Extracts raw Access token from cookies or authorization header.
 * Hierarchy: Checks cookies first (Web clients); falls back to Bearer header (Mobile / API clients).
 */
const extractAccessToken = (req: Request): string => {
  // 1. Check cookies first
  const cookieToken = req.cookies?.accessToken || req.cookies?.token;
  if (cookieToken) {
    return cookieToken;
  }

  // 2. Fall back to Authorization Bearer header
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const bearerToken = authHeader.split(' ')[1];
    if (bearerToken) {
      return bearerToken;
    }
  }

  throw ApiError.unauthorized('Authentication token is required');
};

/**
 * Validates user account status
 */
const validateUserStatus = (status: UserStatus): void => {
  if (status === UserStatus.BLOCKED) {
    throw ApiError.forbidden('Your account has been blocked. Please contact support.');
  }

  if (status === UserStatus.INACTIVE) {
    throw ApiError.forbidden('Your account is inactive. Please contact support.');
  }

  if (status === UserStatus.PENDING_ACTIVATION) {
    throw ApiError.forbidden('Your account is awaiting administrative approval.');
  }
};

/**
 * Validates user role against allowed RBAC list
 */
const validateUserRole = (userRole: Role, allowedRoles: Role[]): void => {
  if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
    throw ApiError.forbidden('You do not have permission to perform this action');
  }
};

/**
 * Middleware to authenticate requests using JWT Access Tokens and enforce Role-Based Access Control (RBAC).
 * Supports both Cookie-based (Web) and Header-based (React Native / Mobile) token transmission.
 *
 * @param allowedRoles - Optional list of roles permitted to access the route. If empty, any authenticated active user is permitted.
 */
export const checkAuth = (...allowedRoles: Role[]) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = extractAccessToken(req);
      const decoded = verifyAccessToken(token);

      const user = await prisma.user.findFirst({
        where: {
          id: decoded.userId,
          deletedAt: null,
        },
      });

      if (!user) {
        throw ApiError.unauthorized('User associated with this token no longer exists');
      }

      validateUserStatus(user.status);
      validateUserRole(user.role, allowedRoles);

      req.user = {
        userId: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
      };

      next();
    } catch (error) {
      next(error);
    }
  };
};
