import { BatchStatus, Role, UserStatus } from '@prisma/client';
import { prisma } from '../../../config';
import { ApiError } from '../../../utils';
import type { IInstitutionResponse } from '../institution.interface';
import { formatInstitutionProfile } from '../institution.utils';

export const getInstitutionProfileService = async (): Promise<IInstitutionResponse> => {
  const adminUser = await prisma.user.findFirst({
    where: {
      role: Role.ADMIN,
      deletedAt: null,
    },
    include: {
      adminProfile: true,
    },
  });

  if (!adminUser) {
    throw ApiError.notFound('Institution details not found');
  }

  const [totalStudents, totalTeachers, totalBatches] = await Promise.all([
    prisma.user.count({
      where: {
        role: Role.STUDENT,
        status: UserStatus.ACTIVE,
        deletedAt: null,
      },
    }),
    prisma.user.count({
      where: {
        role: Role.TEACHER,
        status: UserStatus.ACTIVE,
        deletedAt: null,
      },
    }),
    prisma.batch.count({
      where: {
        status: BatchStatus.ONGOING,
        deletedAt: null,
      },
    }),
  ]);

  return {
    institution: formatInstitutionProfile(adminUser),
    stats: {
      totalStudents,
      totalTeachers,
      totalBatches,
    },
  };
};
