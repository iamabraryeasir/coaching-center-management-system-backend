import { UserStatus } from '@prisma/client';
import { prisma } from '../../../config';
import { ApiError, logger } from '../../../utils';

export const deleteUserService = async (
  targetUserId: string,
  adminUserId: string,
): Promise<{ message: string }> => {
  if (targetUserId === adminUserId) {
    throw ApiError.badRequest('Administrators cannot delete their own account');
  }

  const targetUser = await prisma.user.findFirst({
    where: { id: targetUserId, deletedAt: null },
  });

  if (!targetUser) {
    throw ApiError.notFound('User not found');
  }

  await prisma.$transaction(async (tx) => {
    // 1. Soft-delete user
    await tx.user.update({
      where: { id: targetUserId },
      data: {
        deletedAt: new Date(),
        status: UserStatus.INACTIVE,
      },
    });

    // 2. Revoke all active sessions
    await tx.session.updateMany({
      where: {
        userId: targetUserId,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });

    // 3. Record audit log
    await tx.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'USER_DELETED',
        entity: 'User',
        entityId: targetUserId,
        details: JSON.stringify({
          targetUserEmail: targetUser.email,
          targetUserName: targetUser.name,
          targetUserRole: targetUser.role,
        }),
      },
    });
  });

  logger.audit('USER_DELETED', {
    targetUserId,
    deletedBy: adminUserId,
  });

  return { message: 'User account has been successfully deleted and archived' };
};
