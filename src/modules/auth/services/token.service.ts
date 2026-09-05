import crypto from 'node:crypto';
import { UserStatus } from '@prisma/client';
import { addDays } from 'date-fns';
import { prisma } from '../../../config';
import {
  ApiError,
  generateAccessToken,
  generateRefreshToken,
  getAccessTokenExpiresInSeconds,
  type IJwtPayload,
  verifyRefreshToken,
} from '../../../utils';
import type { IClientMetadata, IRefreshTokenInput, ITokenRefreshResponse } from '../auth.interface';
import { formatSessionUserAgent } from '../auth.utils';

/**
 * Refresh an access token using a rotating refresh token (RFC 6819 compliant).
 */
export const refreshUserTokens = async (
  payload: IRefreshTokenInput,
  metadata: IClientMetadata,
): Promise<ITokenRefreshResponse> => {
  verifyRefreshToken(payload.refreshToken);

  const refreshTokenHash = crypto.createHash('sha256').update(payload.refreshToken).digest('hex');

  const session = await prisma.session.findFirst({
    where: {
      refreshTokenHash,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: { user: true },
  });

  if (!session?.user || session.user.deletedAt) {
    throw ApiError.unauthorized('Session has expired or was revoked. Please log in again.');
  }

  if (session.user.status === UserStatus.BLOCKED || session.user.status === UserStatus.INACTIVE) {
    throw ApiError.forbidden('Your account is no longer active.');
  }

  // Token Rotation: Invalidate the previous refresh token
  await prisma.session.update({
    where: { id: session.id },
    data: { revokedAt: new Date() },
  });

  const tokenPayload: IJwtPayload = {
    userId: session.user.id,
    email: session.user.email,
    role: session.user.role,
    status: session.user.status,
  };

  const newAccessToken = generateAccessToken(tokenPayload);
  const newRefreshToken = generateRefreshToken(tokenPayload);
  const expiresIn = getAccessTokenExpiresInSeconds();

  const newRefreshTokenHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
  const expiresAt = addDays(new Date(), 30);
  const sessionUserAgent = formatSessionUserAgent(metadata, metadata.deviceName, metadata.platform);

  await prisma.session.create({
    data: {
      userId: session.user.id,
      refreshTokenHash: newRefreshTokenHash,
      ipAddress: metadata.ipAddress,
      userAgent: sessionUserAgent,
      expiresAt,
    },
  });

  return {
    tokens: {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn,
    },
  };
};
