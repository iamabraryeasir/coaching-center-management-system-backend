import crypto from 'node:crypto';
import { prisma } from '../../../config';
import type { IClientMetadata, ILogoutInput } from '../auth.interface';

/**
 * Logout user by invalidating the current session or all device sessions.
 */
export const logoutUser = async (
  payload: ILogoutInput,
  metadata?: IClientMetadata,
): Promise<void> => {
  if (!payload.refreshToken) {
    return;
  }

  const refreshTokenHash = crypto.createHash('sha256').update(payload.refreshToken).digest('hex');

  const existingSession = await prisma.session.findFirst({
    where: { refreshTokenHash },
  });

  if (!existingSession) {
    return;
  }

  if (payload.allDevices) {
    // Revoke all active sessions across all devices for this user
    await prisma.session.updateMany({
      where: {
        userId: existingSession.userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: existingSession.userId,
        action: 'USER_LOGOUT_ALL_DEVICES',
        entity: 'User',
        entityId: existingSession.userId,
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent,
      },
    });
  } else {
    // Revoke single device session
    await prisma.session.update({
      where: { id: existingSession.id },
      data: { revokedAt: new Date() },
    });

    await prisma.auditLog.create({
      data: {
        userId: existingSession.userId,
        action: 'USER_LOGOUT',
        entity: 'User',
        entityId: existingSession.userId,
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent,
      },
    });
  }
};
