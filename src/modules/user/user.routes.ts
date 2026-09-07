import { Role } from '@prisma/client';
import { Router } from 'express';
import { checkAuth, singleImageUpload, validateRequest } from '../../middlewares';
import { uploadController } from '../upload';
import * as userController from './user.controller';
import {
  changePasswordSchema,
  getUsersQuerySchema,
  updateMyProfileSchema,
  updateTeacherPermissionsSchema,
  updateUserStatusSchema,
  userIdParamSchema,
} from './user.validation';

const router = Router();

// Self profile & password management (Authenticated users: Student, Teacher, Admin)
router.get('/me', checkAuth(), userController.getMyProfile);

router.patch(
  '/me',
  checkAuth(),
  validateRequest(updateMyProfileSchema),
  userController.updateMyProfile,
);

router.patch(
  '/me/avatar',
  checkAuth(),
  singleImageUpload('avatar'),
  uploadController.uploadMyAvatar,
);

router.delete('/me/avatar', checkAuth(), uploadController.deleteMyAvatar);

router.patch(
  '/change-password',
  checkAuth(),
  validateRequest(changePasswordSchema),
  userController.changePassword,
);

// Administrative User Supervision (Admin only)
router.get(
  '/',
  checkAuth(Role.ADMIN),
  validateRequest(getUsersQuerySchema),
  userController.getAllUsers,
);

// Teacher Operational Permission Delegation (Admin only)
router.patch(
  '/teachers/:id/permissions',
  checkAuth(Role.ADMIN),
  validateRequest(updateTeacherPermissionsSchema),
  userController.updateTeacherPermissions,
);

router.patch(
  '/:id/permissions',
  checkAuth(Role.ADMIN),
  validateRequest(updateTeacherPermissionsSchema),
  userController.updateTeacherPermissions,
);

router.get(
  '/:id',
  checkAuth(Role.ADMIN),
  validateRequest(userIdParamSchema),
  userController.getUserById,
);

router.patch(
  '/:id/status',
  checkAuth(Role.ADMIN),
  validateRequest(updateUserStatusSchema),
  userController.updateUserStatus,
);

router.delete(
  '/:id',
  checkAuth(Role.ADMIN),
  validateRequest(userIdParamSchema),
  userController.deleteUser,
);

export const userRouter = router;
