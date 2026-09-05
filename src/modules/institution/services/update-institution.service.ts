import { Role } from '@prisma/client';
import { prisma } from '../../../config';
import { ApiError, logger } from '../../../utils';
import type { IInstitutionProfile, IUpdateInstitutionInput } from '../institution.interface';
import { formatInstitutionProfile } from '../institution.utils';

export const updateInstitutionProfileService = async (
  payload: IUpdateInstitutionInput,
): Promise<IInstitutionProfile> => {
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

  // Check phone uniqueness if changing adminPhone
  if (payload.adminPhone && payload.adminPhone !== adminUser.phone) {
    const phoneExists = await prisma.user.findFirst({
      where: {
        phone: payload.adminPhone,
        id: { not: adminUser.id },
      },
    });

    if (phoneExists) {
      throw ApiError.conflict('Admin phone number is already registered to another account');
    }
  }

  const updatedAdminUser = await prisma.$transaction(async (tx) => {
    // 1. Update user fields if provided
    if (payload.adminName || payload.adminPhone) {
      await tx.user.update({
        where: { id: adminUser.id },
        data: {
          ...(payload.adminName && { name: payload.adminName }),
          ...(payload.adminPhone && { phone: payload.adminPhone }),
        },
      });
    }

    // 2. Upsert adminProfile fields
    const updatedProfile = await tx.adminProfile.upsert({
      where: { userId: adminUser.id },
      create: {
        userId: adminUser.id,
        institutionName: payload.institutionName || 'Radiant Way Academy',
        institutionAddress: payload.institutionAddress || 'Dhaka, Bangladesh',
        institutionPhone: payload.institutionPhone,
        institutionEmail: payload.institutionEmail,
      },
      update: {
        ...(payload.institutionName !== undefined && { institutionName: payload.institutionName }),
        ...(payload.institutionAddress !== undefined && {
          institutionAddress: payload.institutionAddress,
        }),
        ...(payload.institutionPhone !== undefined && {
          institutionPhone: payload.institutionPhone,
        }),
        ...(payload.institutionEmail !== undefined && {
          institutionEmail: payload.institutionEmail,
        }),
      },
    });

    const refreshedUser = await tx.user.findUniqueOrThrow({
      where: { id: adminUser.id },
    });

    return {
      ...refreshedUser,
      adminProfile: updatedProfile,
    };
  });

  logger.audit('INSTITUTION_UPDATED', {
    adminUserId: adminUser.id,
    updatedFields: Object.keys(payload),
  });

  return formatInstitutionProfile(updatedAdminUser);
};
