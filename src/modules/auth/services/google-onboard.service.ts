import { Role, UserStatus } from '@prisma/client';
import { prisma } from '../../../config';
import { ApiError } from '../../../utils';
import type {
  IClientMetadata,
  IGoogleOnboardInput,
  IGoogleOnboardResponse,
  IInstitutionSummary,
} from '../auth.interface';
import { formatSessionUserAgent, sanitizeAuthUser } from '../auth.utils';

/**
 * Validates uniqueness across email, phone, and Google ID
 */
const checkExistingGoogleStudent = async (
  email: string,
  phone: string,
  googleId: string,
): Promise<void> => {
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ email }, { phone }, { googleId }],
    },
  });

  if (!existingUser) {
    return;
  }

  if (existingUser.googleId === googleId) {
    throw ApiError.conflict('An account is already linked with this Google profile');
  }
  if (existingUser.email.toLowerCase() === email) {
    throw ApiError.conflict('Email address is already registered');
  }
  throw ApiError.conflict('Phone number is already registered');
};

/**
 * Onboards a new Google-authenticated student into PENDING_ACTIVATION state
 */
export const onboardGoogleStudent = async (
  payload: IGoogleOnboardInput,
  metadata?: IClientMetadata,
): Promise<IGoogleOnboardResponse> => {
  const normalizedEmail = payload.email.toLowerCase().trim();
  const normalizedPhone = payload.phone.trim();
  const normalizedGoogleId = payload.googleId.trim();

  await checkExistingGoogleStudent(normalizedEmail, normalizedPhone, normalizedGoogleId);

  const sessionUserAgent = metadata
    ? formatSessionUserAgent(metadata, metadata.deviceName, metadata.platform)
    : undefined;

  const result = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        name: payload.name.trim(),
        email: normalizedEmail,
        password: null, // Google OAuth accounts do not have local passwords
        phone: normalizedPhone,
        avatarUrl: payload.avatarUrl?.trim() || null,
        role: Role.STUDENT,
        status: UserStatus.PENDING_ACTIVATION,
        googleId: normalizedGoogleId,
      },
    });

    const newProfile = await tx.studentProfile.create({
      data: {
        userId: newUser.id,
        guardianName: payload.guardianName.trim(),
        guardianPhone: payload.guardianPhone.trim(),
        institutionName: payload.institutionName?.trim() || null,
        classLevel: payload.classLevel.trim(),
        rollNumber: payload.rollNumber?.trim() || null,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: newUser.id,
        action: 'STUDENT_ONBOARDED_PENDING_APPROVAL',
        entity: 'User',
        entityId: newUser.id,
        details: JSON.stringify({
          email: newUser.email,
          googleId: newUser.googleId,
        }),
        ipAddress: metadata?.ipAddress,
        userAgent: sessionUserAgent,
      },
    });

    return {
      ...newUser,
      studentProfile: newProfile,
    };
  });

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
    user: sanitizeAuthUser(result, institutionSummary),
    message:
      'Onboarding details submitted successfully. Your account is pending administrator approval.',
  };
};
