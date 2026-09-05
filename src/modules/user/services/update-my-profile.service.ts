import { Role } from '@prisma/client';
import { prisma } from '../../../config';
import { ApiError, logger } from '../../../utils';
import type { IUpdateMyProfileInput, IUserProfileResponse } from '../user.interface';
import {
  extractBaseUserUpdates,
  extractStudentProfileUpdates,
  extractTeacherProfileUpdates,
  fetchInstitutionSummary,
  formatUserProfile,
} from '../user.utils';

export const updateMyProfileService = async (
  userId: string,
  payload: IUpdateMyProfileInput,
): Promise<IUserProfileResponse> => {
  const existingUser = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    include: {
      studentProfile: true,
      teacherProfile: true,
      teacherPermissions: true,
      adminProfile: true,
    },
  });

  if (!existingUser) {
    throw ApiError.notFound('User not found');
  }

  // Validate phone uniqueness
  if (payload.phone && payload.phone !== existingUser.phone) {
    const phoneExists = await prisma.user.findFirst({
      where: {
        phone: payload.phone,
        id: { not: userId },
      },
    });

    if (phoneExists) {
      throw ApiError.conflict('Phone number is already registered to another user');
    }
  }

  const baseUpdates = extractBaseUserUpdates(payload);
  const studentUpdates = extractStudentProfileUpdates(payload);
  const teacherUpdates = extractTeacherProfileUpdates(payload);

  const updatedUser = await prisma.$transaction(async (tx) => {
    if (Object.keys(baseUpdates).length > 0) {
      await tx.user.update({
        where: { id: userId },
        data: baseUpdates,
      });
    }

    if (existingUser.role === Role.STUDENT && Object.keys(studentUpdates).length > 0) {
      await tx.studentProfile.upsert({
        where: { userId },
        create: {
          userId,
          guardianName: payload.guardianName || 'Guardian',
          guardianPhone: payload.guardianPhone || existingUser.phone,
          institutionName: payload.institutionName,
          classLevel: payload.classLevel || 'General',
          rollNumber: payload.rollNumber,
        },
        update: studentUpdates,
      });
    }

    if (existingUser.role === Role.TEACHER && Object.keys(teacherUpdates).length > 0) {
      await tx.teacherProfile.upsert({
        where: { userId },
        create: {
          userId,
          designation: payload.designation || 'Instructor',
          qualification: payload.qualification || 'B.Sc',
          specialization: payload.specialization || 'General',
        },
        update: teacherUpdates,
      });
    }

    return tx.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        studentProfile: true,
        teacherProfile: true,
        teacherPermissions: true,
        adminProfile: true,
      },
    });
  });

  logger.audit('USER_PROFILE_UPDATED', {
    userId,
    updatedFields: Object.keys(payload),
  });

  const institutionSummary =
    updatedUser.role === Role.ADMIN ? null : await fetchInstitutionSummary();

  return formatUserProfile(updatedUser, institutionSummary);
};
