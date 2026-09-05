import { Role } from '@prisma/client';
import { Router } from 'express';
import { checkAuth, validateRequest } from '../../middlewares';
import * as userController from './user.controller';
import {
  changePasswordSchema,
  getUsersQuerySchema,
  updateMyProfileSchema,
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
