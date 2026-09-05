import { Role, UserStatus } from '@prisma/client';
import { prisma } from '../../../config';
import { ApiError, logger } from '../../../utils';
import type { IUpdateUserStatusInput, IUserProfileResponse } from '../user.interface';
import { fetchInstitutionSummary, formatUserProfile } from '../user.utils';

export const updateUserStatusService = async (
  targetUserId: string,
  adminUserId: string,
  payload: IUpdateUserStatusInput,
): Promise<IUserProfileResponse> => {
  if (targetUserId === adminUserId) {
    throw ApiError.badRequest('Administrators cannot change their own account status');
  }

  const targetUser = await prisma.user.findFirst({
    where: { id: targetUserId, deletedAt: null },
    include: {
      studentProfile: true,
      teacherProfile: true,
      teacherPermissions: true,
      adminProfile: true,
    },
  });

  if (!targetUser) {
    throw ApiError.notFound('User not found');
  }

  const updatedUser = await prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id: targetUserId },
      data: { status: payload.status },
      include: {
        studentProfile: true,
        teacherProfile: true,
        teacherPermissions: true,
        adminProfile: true,
      },
    });

    // If status is BLOCKED or INACTIVE, revoke all active sessions immediately
    if (payload.status === UserStatus.BLOCKED || payload.status === UserStatus.INACTIVE) {
      await tx.session.updateMany({
        where: {
          userId: targetUserId,
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      });
    }

    await tx.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'USER_STATUS_UPDATED',
        entity: 'User',
        entityId: targetUserId,
        details: JSON.stringify({
          previousStatus: targetUser.status,
          newStatus: payload.status,
          targetUserEmail: targetUser.email,
          reason: payload.reason || 'Administrative status change',
        }),
      },
    });

    return user;
  });

  logger.audit('USER_STATUS_UPDATED', {
    targetUserId,
    newStatus: payload.status,
    updatedBy: adminUserId,
  });

  const institutionSummary =
    updatedUser.role === Role.ADMIN ? null : await fetchInstitutionSummary();

  return formatUserProfile(updatedUser, institutionSummary);
};
