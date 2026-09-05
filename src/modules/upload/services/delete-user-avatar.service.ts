import { prisma } from '../../../config';
import { ApiError, deleteImage, logger } from '../../../utils';
import type { IAvatarUpdateResponse } from '../upload.interface';

export const deleteUserAvatarService = async (userId: string): Promise<IAvatarUpdateResponse> => {
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      deletedAt: null,
    },
  });

  if (!user) {
    throw ApiError.notFound('User not found');
  }

  if (user.avatarUrl) {
    await deleteImage(user.avatarUrl);
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      avatarUrl: null,
    },
    select: {
      id: true,
      avatarUrl: true,
    },
  });

  logger.audit('USER_AVATAR_REMOVED', {
    userId,
  });

  return {
    userId: updatedUser.id,
    avatarUrl: null,
    message: 'Profile picture removed successfully',
  };
};
