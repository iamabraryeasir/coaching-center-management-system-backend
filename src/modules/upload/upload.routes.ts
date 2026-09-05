import { Role } from '@prisma/client';
import { Router } from 'express';
import { checkAuth, singleImageUpload } from '../../middlewares';
import { uploadController } from './upload.controller';

const router = Router();

/**
 * User Self Avatar Operations (Authenticated)
 */
router.post(
  '/avatar',
  checkAuth(Role.ADMIN, Role.TEACHER, Role.STUDENT),
  singleImageUpload('avatar'),
  uploadController.uploadMyAvatar,
);

router.patch(
  '/avatar',
  checkAuth(Role.ADMIN, Role.TEACHER, Role.STUDENT),
  singleImageUpload('avatar'),
  uploadController.uploadMyAvatar,
);

router.delete(
  '/avatar',
  checkAuth(Role.ADMIN, Role.TEACHER, Role.STUDENT),
  uploadController.deleteMyAvatar,
);

/**
 * Admin Upload User Avatar by ID
 */
router.post(
  '/users/:userId/avatar',
  checkAuth(Role.ADMIN),
  singleImageUpload('avatar'),
  uploadController.uploadUserAvatarById,
);

export const uploadRouter: Router = router;
