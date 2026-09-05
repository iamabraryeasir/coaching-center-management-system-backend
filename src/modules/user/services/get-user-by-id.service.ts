import { Role } from '@prisma/client';
import { prisma } from '../../../config';
import { ApiError } from '../../../utils';
import type { IUserProfileResponse } from '../user.interface';
import { fetchInstitutionSummary, formatUserProfile } from '../user.utils';

export const getUserByIdService = async (id: string): Promise<IUserProfileResponse> => {
  const user = await prisma.user.findFirst({
    where: {
      id,
      deletedAt: null,
    },
    include: {
      studentProfile: true,
      teacherProfile: true,
      teacherPermissions: true,
      adminProfile: true,
    },
  });

  if (!user) {
    throw ApiError.notFound('User not found');
  }

  const institutionSummary = user.role === Role.ADMIN ? null : await fetchInstitutionSummary();

  return formatUserProfile(user, institutionSummary);
};
