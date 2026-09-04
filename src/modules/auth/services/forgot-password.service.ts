import crypto from 'node:crypto';
import { config, prisma, redis } from '../../../config';
import { sendPasswordResetEmail } from '../../../utils';
import type { IClientMetadata, IForgotPasswordInput } from '../auth.interface';

/**
 * Handles password reset request with anti-enumeration protection and Redis-backed temporary tokens.
 */
export const requestPasswordReset = async (
  payload: IForgotPasswordInput,
  metadata?: IClientMetadata,
): Promise<{ message: string }> => {
  const normalizedEmail = payload.email.toLowerCase().trim();

  const user = await prisma.user.findFirst({
    where: {
      email: normalizedEmail,
      deletedAt: null,
    },
  });

  // Anti-enumeration defense: always respond with the same message
  if (!user) {
    return {
      message:
        'If your email is registered with us, a password reset link has been dispatched to your inbox.',
    };
  }

  // Generate high-entropy 32-byte cryptographic token
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  // Store in Redis with 15-minute (900s) TTL
  await redis.set(`pwd_reset:${tokenHash}`, user.id, {
    expiration: {
      type: 'EX',
      value: 900,
    },
  });

  const resetUrl = `${config.FRONTEND_URL}/reset-password?token=${rawToken}&email=${encodeURIComponent(
    user.email,
  )}`;

  // Dispatch password reset email
  await sendPasswordResetEmail(user.email, user.name, resetUrl);

  // Record audit log
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: 'PASSWORD_RESET_REQUESTED',
      entity: 'User',
      entityId: user.id,
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
    },
  });

  return {
    message:
      'If your email is registered with us, a password reset link has been dispatched to your inbox.',
  };
};
