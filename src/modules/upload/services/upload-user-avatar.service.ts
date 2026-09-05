import { prisma } from '../../../config';
import { ApiError, deleteImage, logger, uploadImageBuffer } from '../../../utils';
import type { IAvatarUpdateResponse } from '../upload.interface';

export const uploadUserAvatarService = async (
  userId: string,
  file?: Express.Multer.File,
): Promise<IAvatarUpdateResponse> => {
  if (!file?.buffer) {
    throw ApiError.badRequest('No image file provided for avatar upload.');
  }

  // 1. Verify user exists and is not soft-deleted
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      deletedAt: null,
    },
  });

  if (!user) {
    throw ApiError.notFound('User not found');
  }

  // 2. If user already has an avatar on Cloudinary, remove the old one
  if (user.avatarUrl) {
    await deleteImage(user.avatarUrl).catch((err) => {
      logger.warn(`Failed to remove old avatar for user ${userId}:`, err);
    });
  }

  // 3. Upload new image buffer to Cloudinary with AI Face-Detection square cropping
  const filename = `avatar_${userId}_${Date.now()}`;
  const uploadResult = await uploadImageBuffer(file.buffer, {
    folder: 'coaching_center/avatars',
    filename,
    isAvatar: true,
    width: 500,
    height: 500,
    gravity: 'face',
    crop: 'fill',
  });

  // 4. Update avatarUrl in database
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      avatarUrl: uploadResult.url,
    },
    select: {
      id: true,
      avatarUrl: true,
    },
  });

  // 5. Audit Log
  logger.audit('USER_AVATAR_UPDATED', {
    userId,
    avatarUrl: updatedUser.avatarUrl,
  });

  return {
    userId: updatedUser.id,
    avatarUrl: updatedUser.avatarUrl,
    message: 'Profile picture updated successfully',
  };
};
