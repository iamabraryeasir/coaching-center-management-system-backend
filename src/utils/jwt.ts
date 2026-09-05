import type { Role, UserStatus } from '@prisma/client';
import jwt, { type Secret, type SignOptions } from 'jsonwebtoken';
import { config } from '../config';
import { ApiError } from './api-error';

export interface IJwtPayload {
  userId: string;
  email: string;
  role: Role;
  status: UserStatus;
}

export const getAccessTokenExpiresInSeconds = (): number => {
  const expiresIn = config.JWT_ACCESS_EXPIRES_IN;
  if (typeof expiresIn === 'number') {
    return expiresIn;
  }
  const match = String(expiresIn).match(/^(\d+)([smhd])$/);
  if (!match) {
    return 900; // fallback: 15 minutes
  }
  const rawVal = match[1];
  const unit = match[2];
  if (!rawVal || !unit) {
    return 900;
  }
  const value = Number.parseInt(rawVal, 10);
  switch (unit) {
    case 's':
      return value;
    case 'm':
      return value * 60;
    case 'h':
      return value * 3600;
    case 'd':
      return value * 86400;
    default:
      return 900;
  }
};

export const generateAccessToken = (payload: IJwtPayload): string => {
  return jwt.sign(payload, config.JWT_ACCESS_SECRET as Secret, {
    expiresIn: config.JWT_ACCESS_EXPIRES_IN as SignOptions['expiresIn'],
  });
};

export const generateRefreshToken = (payload: IJwtPayload): string => {
  return jwt.sign(payload, config.JWT_REFRESH_SECRET as Secret, {
    expiresIn: config.JWT_REFRESH_EXPIRES_IN as SignOptions['expiresIn'],
  });
};

export const verifyAccessToken = (token: string): IJwtPayload => {
  try {
    return jwt.verify(token, config.JWT_ACCESS_SECRET as Secret) as IJwtPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw ApiError.unauthorized('Access token has expired');
    }
    throw ApiError.unauthorized('Invalid access token');
  }
};

export const verifyRefreshToken = (token: string): IJwtPayload => {
  try {
    return jwt.verify(token, config.JWT_REFRESH_SECRET as Secret) as IJwtPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw ApiError.unauthorized('Refresh token has expired');
    }
    throw ApiError.unauthorized('Invalid refresh token');
  }
};
