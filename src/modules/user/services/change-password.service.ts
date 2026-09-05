import bcrypt from 'bcryptjs';
import { config, prisma } from '../../../config';
import { ApiError, logger } from '../../../utils';
import { DUMMY_BCRYPT_HASH } from '../../auth/auth.utils';
import type { IChangePasswordInput } from '../user.interface';

export const changePasswordService = async (
  userId: string,
  payload: IChangePasswordInput,
): Promise<{ message: string }> => {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
  });

  if (!user) {
    throw ApiError.notFound('User not found');
  }

  // Handle Google OAuth accounts without set passwords
  if (!user.password) {
    throw ApiError.badRequest(
      'Your account was created via Google OAuth and does not have a password configured.',
    );
  }

  // Timing attack mitigation
  const passwordToCompare = user.password || DUMMY_BCRYPT_HASH;
  const isMatch = await bcrypt.compare(payload.currentPassword, passwordToCompare);

  if (!isMatch) {
    throw ApiError.badRequest('Current password provided is incorrect');
  }

  const hashedPassword = await bcrypt.hash(payload.newPassword, config.BCRYPT_SALT_ROUNDS);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    // Revoke other active sessions for security
    await tx.session.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });

    await tx.auditLog.create({
      data: {
        userId,
        action: 'PASSWORD_CHANGED',
        entity: 'User',
        entityId: userId,
        details: JSON.stringify({ reason: 'User initiated password update' }),
      },
    });
  });

  logger.audit('PASSWORD_CHANGED', { userId });

  return { message: 'Password changed successfully. Please log in again with your new password.' };
};
