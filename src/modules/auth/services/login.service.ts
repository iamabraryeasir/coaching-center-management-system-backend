import crypto from 'node:crypto';
import { Role, UserStatus } from '@prisma/client';
import bcryptjs from 'bcryptjs';
import { prisma } from '../../../config';
import {
  ApiError,
  generateAccessToken,
  generateRefreshToken,
  getAccessTokenExpiresInSeconds,
  type IJwtPayload,
} from '../../../utils';
import type {
  IAuthTokens,
  IClientMetadata,
  IInstitutionSummary,
  ILoginInput,
  ILoginResponse,
} from '../auth.interface';
import { DUMMY_BCRYPT_HASH, formatSessionUserAgent, sanitizeAuthUser } from '../auth.utils';

/**
 * Authenticate a user with email and password with timing-attack defense and multi-platform device tracking.
 */
export const loginUser = async (
  payload: ILoginInput,
  metadata: IClientMetadata,
): Promise<ILoginResponse> => {
  const normalizedEmail = payload.email.toLowerCase().trim();
  const sessionUserAgent = formatSessionUserAgent(metadata, metadata.deviceName, metadata.platform);

  const user = await prisma.user.findFirst({
    where: {
      email: normalizedEmail,
      deletedAt: null,
    },
    include: {
      studentProfile: true,
      teacherProfile: true,
      teacherPermissions: true,
      adminProfile: true,
    },
  });

  // Timing attack mitigation: always execute bcrypt comparison even if user does not exist
  const passwordToCompare = user?.password || DUMMY_BCRYPT_HASH;
  const isPasswordValid = await bcryptjs.compare(payload.password, passwordToCompare);

  if (!user?.password || !isPasswordValid) {
    if (user) {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'USER_LOGIN_FAILED',
          entity: 'User',
          entityId: user.id,
          details: JSON.stringify({ reason: 'Invalid password credentials' }),
          ipAddress: metadata.ipAddress,
          userAgent: sessionUserAgent,
        },
      });
    }
    throw ApiError.unauthorized('Invalid email or password');
  }

  // Account status validation
  if (user.status === UserStatus.BLOCKED) {
    throw ApiError.forbidden('Your account has been blocked. Please contact administration.');
  }
  if (user.status === UserStatus.INACTIVE) {
    throw ApiError.forbidden('Your account is currently inactive. Please contact administration.');
  }
  if (user.status === UserStatus.PENDING_ACTIVATION) {
    throw ApiError.forbidden('Your account is awaiting approval by an administrator.');
  }

  const tokenPayload: IJwtPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    status: user.status,
  };

  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);
  const expiresIn = getAccessTokenExpiresInSeconds();

  const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  // Store session in DB for active session management and instant revocation
  await prisma.session.create({
    data: {
      userId: user.id,
      refreshTokenHash,
      ipAddress: metadata.ipAddress,
      userAgent: sessionUserAgent,
      expiresAt,
    },
  });

  // Record audit log for successful login
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: 'USER_LOGIN_SUCCESS',
      entity: 'User',
      entityId: user.id,
      details: JSON.stringify({
        role: user.role,
        platform: metadata.platform || 'web',
        deviceName: metadata.deviceName || 'default',
      }),
      ipAddress: metadata.ipAddress,
      userAgent: sessionUserAgent,
    },
  });

  const tokens: IAuthTokens = {
    accessToken,
    refreshToken,
    expiresIn,
  };

  let institutionSummary: IInstitutionSummary | null = null;
  if (user.role !== Role.ADMIN) {
    const adminUser = await prisma.user.findFirst({
      where: { role: Role.ADMIN, deletedAt: null },
      include: { adminProfile: true },
    });
    if (adminUser?.adminProfile) {
      institutionSummary = {
        name: adminUser.adminProfile.institutionName,
        address: adminUser.adminProfile.institutionAddress,
        phone: adminUser.adminProfile.institutionPhone,
        email: adminUser.adminProfile.institutionEmail,
      };
    }
  }

  return {
    user: sanitizeAuthUser(user, institutionSummary),
    tokens,
  };
};
