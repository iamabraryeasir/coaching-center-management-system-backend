import { prisma } from '../../../config';
import type { IClientMetadata } from '../auth.interface';

export const logoutAllDevicesService = async (
  userId: string,
  metadata?: IClientMetadata,
): Promise<{ message: string; revokedCount: number }> => {
  const result = await prisma.session.updateMany({
    where: {
      userId,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });

  await prisma.auditLog.create({
    data: {
      userId,
      action: 'USER_LOGOUT_ALL_DEVICES',
      entity: 'User',
      entityId: userId,
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
      details: JSON.stringify({ revokedCount: result.count }),
    },
  });

  return {
    message: 'Successfully logged out from all active sessions',
    revokedCount: result.count,
  };
};
