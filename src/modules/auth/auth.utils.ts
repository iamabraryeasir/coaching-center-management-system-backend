import { type Gender, type Permission, Role, type UserStatus } from '@prisma/client';
import type { CookieOptions, Request } from 'express';
import { config } from '../../config';
import type { IAuthUser, IClientMetadata, IInstitutionSummary } from './auth.interface';

/**
 * Constant dummy bcrypt hash to prevent timing attacks during user lookup
 */
export const DUMMY_BCRYPT_HASH = '$2a$10$wN9a8N4o1j1uL7yO4Cg2nOz4W0.n3eN1fQkIuJv5Qy7dF0a9mG2rW';

/**
 * Generates secure Access Token HTTP cookie options for web clients
 */
export const getAccessTokenCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: config.NODE_ENV === 'production',
  sameSite: config.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 15 * 60 * 1000, // 15 minutes
});

/**
 * Generates secure Refresh Token HTTP cookie options for web clients
 */
export const getRefreshTokenCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: config.NODE_ENV === 'production',
  sameSite: config.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
});

/**
 * Detects the client platform from User-Agent or custom headers
 */
export const detectPlatform = (
  userAgent: string,
  customPlatform?: string,
): 'ios' | 'android' | 'web' => {
  if (customPlatform === 'ios' || /iPhone|iPad|iPod/i.test(userAgent)) {
    return 'ios';
  }
  if (customPlatform === 'android' || /Android/i.test(userAgent)) {
    return 'android';
  }
  return 'web';
};

/**
 * Detects device name from User-Agent and headers
 */
export const detectDeviceName = (
  userAgent: string,
  platform: 'ios' | 'android' | 'web',
  customDeviceName?: string,
  secPlatform?: string,
): string => {
  if (customDeviceName) {
    return customDeviceName;
  }

  if (platform === 'ios') {
    return /iPad/i.test(userAgent) ? 'Apple iPad' : 'Apple iPhone';
  }

  if (platform === 'android') {
    const match = userAgent.match(/Android[^;]+; ([^)]+)/);
    return match?.[1]?.trim() || 'Android Device';
  }

  if (/Windows/i.test(userAgent) || secPlatform?.includes('Windows')) {
    return 'Windows PC';
  }
  if (/Macintosh|Mac OS X/i.test(userAgent) || secPlatform?.includes('macOS')) {
    return 'Macintosh';
  }
  if (/Linux/i.test(userAgent) || secPlatform?.includes('Linux')) {
    return 'Linux Desktop';
  }
  if (/Postman/i.test(userAgent)) {
    return 'Postman Runtime';
  }
  return 'Web Browser';
};

/**
 * Automatically extracts and parses client device and platform metadata from HTTP request headers.
 */
export const extractClientMetadata = (req: Request): IClientMetadata => {
  const userAgent = req.headers['user-agent'] || '';
  const secPlatform = req.headers['sec-ch-ua-platform'] as string | undefined;
  const customPlatform = req.headers['x-platform'] as string | undefined;
  const customDeviceName = req.headers['x-device-name'] as string | undefined;

  const platform = detectPlatform(userAgent, customPlatform);
  const deviceName = detectDeviceName(userAgent, platform, customDeviceName, secPlatform);

  return {
    ipAddress: req.ip || req.socket.remoteAddress,
    userAgent: userAgent || undefined,
    deviceName,
    platform,
  };
};

/**
 * Builds a descriptive session identifier from client device metadata
 */
export const formatSessionUserAgent = (
  metadata: IClientMetadata,
  deviceName?: string,
  platform?: string,
): string => {
  const parts: string[] = [];
  if (deviceName) {
    parts.push(deviceName);
  }
  if (platform) {
    parts.push(`(${platform.toUpperCase()})`);
  }
  if (metadata.userAgent) {
    parts.push(metadata.userAgent);
  }
  return parts.length > 0 ? parts.join(' - ') : 'Unknown Client';
};

/**
 * Sanitizes raw database user into a clean, role-tailored payload for Web and React Native clients.
 * Strips internal database fields (password, deletedAt, googleId) and eliminates null relation noise.
 */
export const sanitizeAuthUser = (
  user: {
    id: string;
    name: string;
    email: string;
    phone: string;
    gender?: Gender | null;
    avatarUrl: string | null;
    role: Role;
    status: UserStatus;
    createdAt: Date;
    studentProfile?: {
      id: string;
      guardianName: string;
      guardianPhone: string;
      institutionName: string | null;
      classLevel: string;
      rollNumber: string | null;
    } | null;
    teacherProfile?: {
      id: string;
      designation: string;
      qualification: string;
      specialization: string;
      joiningDate: Date | null;
    } | null;
    teacherPermissions?: { permission: Permission }[];
    adminProfile?: {
      id: string;
      institutionName: string;
      institutionAddress: string;
      institutionPhone: string | null;
      institutionEmail: string | null;
    } | null;
  },
  institutionSummary?: IInstitutionSummary | null,
): IAuthUser => {
  const base = {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    gender: user.gender || null,
    avatarUrl: user.avatarUrl,
    status: user.status,
    createdAt: user.createdAt,
  };

  if (user.role === Role.ADMIN) {
    return {
      ...base,
      role: Role.ADMIN,
      adminProfile: user.adminProfile
        ? {
            id: user.adminProfile.id,
            institutionName: user.adminProfile.institutionName,
            institutionAddress: user.adminProfile.institutionAddress,
            institutionPhone: user.adminProfile.institutionPhone,
            institutionEmail: user.adminProfile.institutionEmail,
          }
        : null,
    };
  }

  if (user.role === Role.STUDENT) {
    return {
      ...base,
      role: Role.STUDENT,
      studentProfile: user.studentProfile
        ? {
            id: user.studentProfile.id,
            guardianName: user.studentProfile.guardianName,
            guardianPhone: user.studentProfile.guardianPhone,
            institutionName: user.studentProfile.institutionName,
            classLevel: user.studentProfile.classLevel,
            rollNumber: user.studentProfile.rollNumber,
          }
        : null,
      institution: institutionSummary || null,
    };
  }

  const permissions: Permission[] = user.teacherPermissions?.map((p) => p.permission) || [];

  return {
    ...base,
    role: Role.TEACHER,
    teacherProfile: user.teacherProfile
      ? {
          id: user.teacherProfile.id,
          designation: user.teacherProfile.designation,
          qualification: user.teacherProfile.qualification,
          specialization: user.teacherProfile.specialization,
          joiningDate: user.teacherProfile.joiningDate,
        }
      : null,
    permissions,
    institution: institutionSummary || null,
  };
};
