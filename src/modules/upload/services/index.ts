import { deleteUserAvatarService } from './delete-user-avatar.service';
import { uploadUserAvatarService } from './upload-user-avatar.service';

export const uploadService = Object.freeze({
  uploadUserAvatar: uploadUserAvatarService,
  deleteUserAvatar: deleteUserAvatarService,
});

export { deleteUserAvatarService, uploadUserAvatarService };
