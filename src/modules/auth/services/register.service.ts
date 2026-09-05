import { Role, UserStatus } from '@prisma/client';
import bcryptjs from 'bcryptjs';
import { prisma } from '../../../config';
import { ApiError } from '../../../utils';
import type {
  IAuthUser,
  IClientMetadata,
  IInstitutionSummary,
  IRegisterStudentInput,
} from '../auth.interface';
import { sanitizeAuthUser } from '../auth.utils';

/**
 * Register a new student under the institution (Admin-only action).
 */
export const registerStudentAccount = async (
  payload: IRegisterStudentInput,
  metadata?: IClientMetadata,
): Promise<{ user: IAuthUser }> => {
  const normalizedEmail = payload.email.toLowerCase().trim();
  const normalizedPhone = payload.phone.trim();

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ email: normalizedEmail }, { phone: normalizedPhone }],
    },
  });

  if (existingUser) {
    if (existingUser.email.toLowerCase() === normalizedEmail) {
      throw ApiError.conflict('Email address is already registered');
    }
    throw ApiError.conflict('Phone number is already registered');
  }

  const hashedPassword = await bcryptjs.hash(payload.password, 10);

  const result = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        name: payload.name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        phone: normalizedPhone,
        role: Role.STUDENT,
        status: UserStatus.ACTIVE,
      },
    });

    const newProfile = await tx.studentProfile.create({
      data: {
        userId: newUser.id,
        guardianName: payload.guardianName.trim(),
        guardianPhone: payload.guardianPhone.trim(),
        institutionName: payload.institutionName?.trim(),
        classLevel: payload.classLevel.trim(),
        rollNumber: payload.rollNumber?.trim(),
      },
    });

    // Record audit trail for student registration
    await tx.auditLog.create({
      data: {
        userId: newUser.id,
        action: 'STUDENT_REGISTERED',
        entity: 'User',
        entityId: newUser.id,
        details: JSON.stringify({
          email: newUser.email,
        }),
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent,
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
  };
};
