import { Role } from '@prisma/client';
import { prisma } from '../../../config';
import { ApiError, logger } from '../../../utils';
import type { IUpdateTeacherByAdminInput, IUserProfileResponse } from '../user.interface';
import {
  extractBaseUserUpdates,
  extractTeacherProfileUpdates,
  fetchInstitutionSummary,
  formatUserProfile,
} from '../user.utils';

export const updateTeacherByAdminService = async (
  teacherId: string,
  adminId: string,
  payload: IUpdateTeacherByAdminInput,
): Promise<IUserProfileResponse> => {
  const existingUser = await prisma.user.findFirst({
    where: { id: teacherId, deletedAt: null },
    include: {
      teacherProfile: true,
    },
  });

  if (!existingUser) {
    throw ApiError.notFound('Teacher not found');
  }

  if (existingUser.role !== Role.TEACHER) {
    throw ApiError.badRequest('Target user is not a teacher');
  }

  // Validate email uniqueness if changing email
  if (payload.email && payload.email !== existingUser.email) {
    const emailExists = await prisma.user.findFirst({
      where: {
        email: payload.email,
        id: { not: teacherId },
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
        id: { not: teacherId },
      },
    });

    if (phoneExists) {
      throw ApiError.conflict('Phone number is already registered to another user');
    }
  }

  const baseUpdates = extractBaseUserUpdates(payload);
  const teacherUpdates = extractTeacherProfileUpdates(payload);

  const updatedUser = await prisma.$transaction(async (tx) => {
    if (Object.keys(baseUpdates).length > 0) {
      await tx.user.update({
        where: { id: teacherId },
        data: baseUpdates,
      });
    }

    if (Object.keys(teacherUpdates).length > 0) {
      await tx.teacherProfile.upsert({
        where: { userId: teacherId },
        create: {
          userId: teacherId,
          designation: payload.designation || 'Instructor',
          qualification: payload.qualification || 'B.Sc',
          specialization: payload.specialization || 'General',
          joiningDate: payload.joiningDate ? new Date(payload.joiningDate) : null,
        },
        update: teacherUpdates,
      });
    }

    return tx.user.findUniqueOrThrow({
      where: { id: teacherId },
      include: {
        studentProfile: true,
        teacherProfile: true,
        teacherPermissions: true,
        adminProfile: true,
      },
    });
  });

  logger.audit('ADMIN_UPDATED_TEACHER_PROFILE', {
    adminId,
    teacherId,
    updatedFields: Object.keys(payload),
  });

  const institutionSummary = await fetchInstitutionSummary();

  return formatUserProfile(updatedUser, institutionSummary);
};
