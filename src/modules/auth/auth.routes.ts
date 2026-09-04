import { Role } from '@prisma/client';
import { Router } from 'express';
import { checkAuth, validateRequest } from '../../middlewares';
import {
  forgotPassword,
  login,
  logout,
  refreshToken,
  registerStudent,
  resetPassword,
} from './auth.controller';
import {
  forgotPasswordSchema,
  loginSchema,
  logoutSchema,
  refreshTokenSchema,
  registerStudentSchema,
  resetPasswordSchema,
} from './auth.validation';

const authRouter: Router = Router();

/**
 * Direct Student Registration (Protected — ADMIN only, SUPER_ADMIN cannot register students)
 */
authRouter.post(
  '/register-student',
  checkAuth(Role.ADMIN),
  validateRequest(registerStudentSchema),
  registerStudent,
);

/**
 * Common login for all roles
 */
authRouter.post('/login', validateRequest(loginSchema), login);

/**
 * Get new access token using the refresh token
 */
authRouter.post('/refresh-token', validateRequest(refreshTokenSchema), refreshToken);

/**
 * Logout user
 */
authRouter.post('/logout', validateRequest(logoutSchema), logout);

/**
 * Request password recovery email
 */
authRouter.post('/forgot-password', validateRequest(forgotPasswordSchema), forgotPassword);

/**
 * Reset password using single-use Redis-backed token
 */
authRouter.post('/reset-password', validateRequest(resetPasswordSchema), resetPassword);

export { authRouter };
