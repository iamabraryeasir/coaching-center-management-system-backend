import { Role } from '@prisma/client';
import { prisma } from '../../../config';
import { ApiError, logger } from '../../../utils';
import type { IUpdateStudentByAdminInput, IUserProfileResponse } from '../user.interface';
import {
  extractBaseUserUpdates,
  extractStudentProfileUpdates,
  fetchInstitutionSummary,
  formatUserProfile,
} from '../user.utils';

export const updateStudentByAdminService = async (
  studentId: string,
  adminId: string,
  payload: IUpdateStudentByAdminInput,
): Promise<IUserProfileResponse> => {
  const existingUser = await prisma.user.findFirst({
    where: { id: studentId, deletedAt: null },
    include: {
      studentProfile: true,
    },
  });

  if (!existingUser) {
    throw ApiError.notFound('Student not found');
  }

  if (existingUser.role !== Role.STUDENT) {
    throw ApiError.badRequest('Target user is not a student');
  }

  // Validate email uniqueness if changing email
  if (payload.email && payload.email !== existingUser.email) {
    const emailExists = await prisma.user.findFirst({
      where: {
        email: payload.email,
        id: { not: studentId },
      },
    });

    if (emailExists) {
      throw ApiError.conflict('Email address is already registered to another user');
    }
  }

  // Validate phone uniqueness if changing phone
  if (payload.phone && payload.phone !== existingUser.phone) {
    const phoneExists = await prisma.user.findFirst({
      where: {
        phone: payload.phone,
        id: { not: studentId },
      },
    });

    if (phoneExists) {
      throw ApiError.conflict('Phone number is already registered to another user');
    }
  }

  const baseUpdates = extractBaseUserUpdates(payload);
  const studentUpdates = extractStudentProfileUpdates(payload);

  const updatedUser = await prisma.$transaction(async (tx) => {
    if (Object.keys(baseUpdates).length > 0) {
      await tx.user.update({
        where: { id: studentId },
        data: baseUpdates,
      });
    }

    if (Object.keys(studentUpdates).length > 0) {
      await tx.studentProfile.upsert({
        where: { userId: studentId },
        create: {
          userId: studentId,
          guardianName: payload.guardianName || 'Guardian',
          guardianPhone: payload.guardianPhone || payload.phone || existingUser.phone,
          institutionName: payload.institutionName,
          classLevel: payload.classLevel || 'General',
          rollNumber: payload.rollNumber,
        },
        update: studentUpdates,
      });
    }

    return tx.user.findUniqueOrThrow({
      where: { id: studentId },
      include: {
        studentProfile: true,
        teacherProfile: true,
        teacherPermissions: true,
        adminProfile: true,
      },
    });
  });

  logger.audit('ADMIN_UPDATED_STUDENT_PROFILE', {
    adminId,
    studentId,
    updatedFields: Object.keys(payload),
  });

  const institutionSummary = await fetchInstitutionSummary();

  return formatUserProfile(updatedUser, institutionSummary);
};
