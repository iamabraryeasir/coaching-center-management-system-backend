import crypto from 'node:crypto';
import bcryptjs from 'bcryptjs';
import { prisma, redis } from '../../../config';
import { ApiError } from '../../../utils';
import type { IClientMetadata, IResetPasswordInput } from '../auth.interface';

/**
 * Resets user password using a verified, single-use Redis-backed token.
 * Automatically revokes all existing active sessions across all devices.
 */
export const resetUserPassword = async (
  payload: IResetPasswordInput,
  metadata?: IClientMetadata,
): Promise<{ message: string }> => {
  const tokenHash = crypto.createHash('sha256').update(payload.token.trim()).digest('hex');

  // Atomic fetch and delete: ensures the token can only ever be consumed once
  const userId = await redis.getDel(`pwd_reset:${tokenHash}`);

  if (!userId) {
    throw ApiError.badRequest(
      'Invalid or expired password reset token. Please request a new password reset link.',
    );
  }

  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      deletedAt: null,
    },
  });

  if (!user) {
    throw ApiError.notFound('User account associated with this token was not found.');
  }

  const hashedPassword = await bcryptjs.hash(payload.newPassword, 10);

  // Execute password change and complete session invalidation in a transaction
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // Revoke all active device sessions for total security
    await tx.session.updateMany({
      where: {
        userId: user.id,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    // Record audit trail
    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: 'PASSWORD_RESET_SUCCESS',
        entity: 'User',
        entityId: user.id,
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent,
      },
    });
  });

  return {
    message: 'Password has been reset successfully. Please log in with your new password.',
  };
};
