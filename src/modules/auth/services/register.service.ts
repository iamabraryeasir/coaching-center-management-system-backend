import { Role, UserStatus } from '@prisma/client';
import bcryptjs from 'bcryptjs';
import { prisma } from '../../../config';
import { ApiError } from '../../../utils';
import type { IAuthUser, IClientMetadata, IRegisterStudentInput } from '../auth.interface';
import { sanitizeAuthUser } from '../auth.utils';

/**
 * Register a new student under a branch Admin (Functional Implementation).
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

  if (!payload.adminId) {
    throw ApiError.badRequest('Branch Admin ID is required');
  }

  // Verify branch Admin exists and has ADMIN role
  const branchAdmin = await prisma.user.findFirst({
    where: {
      id: payload.adminId,
      role: Role.ADMIN,
      deletedAt: null,
    },
    include: {
      adminProfile: true,
    },
  });

  if (!branchAdmin) {
    throw ApiError.notFound('Branch Admin not found or is no longer active');
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
        adminId: payload.adminId,
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
          branchAdminId: branchAdmin.id,
          branchName: branchAdmin.adminProfile?.branchName,
        }),
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent,
      },
    });

    return {
      ...newUser,
      studentProfile: newProfile,
      admin: branchAdmin,
    };
  });

  return {
    user: sanitizeAuthUser(result),
  };
};
