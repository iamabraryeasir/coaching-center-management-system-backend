import crypto from 'node:crypto';
import { Role, UserStatus } from '@prisma/client';
import { addDays } from 'date-fns';
import { OAuth2Client } from 'google-auth-library';
import { config, prisma } from '../../../config';
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
  IGoogleLoginInput,
  IGoogleLoginResponse,
  IInstitutionSummary,
} from '../auth.interface';
import { formatSessionUserAgent, sanitizeAuthUser } from '../auth.utils';

const googleClient = new OAuth2Client(config.GOOGLE_CLIENT_ID);

interface IVerifiedGoogleToken {
  googleId: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

/**
 * Cryptographically verifies Google ID Token via Google Identity Services
 */
export const verifyGoogleIdToken = async (idToken: string): Promise<IVerifiedGoogleToken> => {
  if (!config.GOOGLE_CLIENT_ID) {
    throw ApiError.internal('Google OAuth is not configured on the server');
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: config.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email) {
      throw ApiError.unauthorized('Invalid Google ID token payload');
    }

    return {
      googleId: payload.sub,
      email: payload.email.toLowerCase().trim(),
      name: payload.name || payload.email.split('@')[0] || 'Student',
      avatarUrl: payload.picture || null,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw ApiError.unauthorized('Invalid or expired Google ID token');
  }
};

/**
 * Validates role and lifecycle status for a Google-authenticated user
 */
const validateStudentAccountState = (user: { role: Role; status: UserStatus }): void => {
  if (user.role !== Role.STUDENT) {
    throw ApiError.forbidden(
      'Google login is strictly permitted for students only. Staff and administrators must use email and password credentials.',
    );
  }

  if (user.status === UserStatus.BLOCKED) {
    throw ApiError.forbidden('Your account has been suspended. Please contact administration.');
  }
  if (user.status === UserStatus.INACTIVE) {
    throw ApiError.forbidden('Your account is currently inactive. Please contact administration.');
  }
  if (user.status === UserStatus.PENDING_ACTIVATION) {
    throw ApiError.forbidden('Your account is awaiting approval by an administrator.');
  }
};

/**
 * Authenticates a student via Google Identity Services (GIS) ID Token
 */
export const loginWithGoogle = async (
  payload: IGoogleLoginInput,
  metadata: IClientMetadata,
): Promise<IGoogleLoginResponse> => {
  const googleData = await verifyGoogleIdToken(payload.idToken);

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ googleId: googleData.googleId }, { email: googleData.email }],
      deletedAt: null,
    },
    include: {
      studentProfile: true,
      teacherProfile: true,
      teacherPermissions: true,
      adminProfile: true,
    },
  });

  if (!existingUser) {
    return {
      isNewUser: true,
      googleId: googleData.googleId,
      email: googleData.email,
      name: googleData.name,
      avatarUrl: googleData.avatarUrl,
    };
  }

  validateStudentAccountState(existingUser);

  // Link googleId or avatar if not yet attached
  let activeUser = existingUser;
  const needsGoogleIdLink = !existingUser.googleId;
  const needsAvatarLink = !existingUser.avatarUrl && Boolean(googleData.avatarUrl);

  if (needsGoogleIdLink || needsAvatarLink) {
    activeUser = await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        ...(needsGoogleIdLink ? { googleId: googleData.googleId } : {}),
        ...(needsAvatarLink ? { avatarUrl: googleData.avatarUrl } : {}),
      },
      include: {
        studentProfile: true,
        teacherProfile: true,
        teacherPermissions: true,
        adminProfile: true,
      },
    });
  }

  const sessionUserAgent = formatSessionUserAgent(metadata, metadata.deviceName, metadata.platform);

  const tokenPayload: IJwtPayload = {
    userId: activeUser.id,
    email: activeUser.email,
    role: activeUser.role,
    status: activeUser.status,
  };

  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);
  const expiresIn = getAccessTokenExpiresInSeconds();

  const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const expiresAt = addDays(new Date(), 30); // 30 days

  await prisma.session.create({
    data: {
      userId: activeUser.id,
      refreshTokenHash,
      ipAddress: metadata.ipAddress,
      userAgent: sessionUserAgent,
      expiresAt,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: activeUser.id,
      action: 'USER_LOGIN_SUCCESS',
      entity: 'User',
      entityId: activeUser.id,
      details: JSON.stringify({
        provider: 'google',
        role: activeUser.role,
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

  return {
    isNewUser: false,
    user: sanitizeAuthUser(activeUser, institutionSummary),
    tokens,
  };
};
