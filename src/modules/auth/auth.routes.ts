import { Role } from '@prisma/client';
import { Router } from 'express';
import { checkAuth, validateRequest } from '../../middlewares';
import { login, logout, refreshToken, registerStudent } from './auth.controller';
import {
  loginSchema,
  logoutSchema,
  refreshTokenSchema,
  registerStudentSchema,
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

authRouter.post('/login', validateRequest(loginSchema), login);
authRouter.post('/refresh-token', validateRequest(refreshTokenSchema), refreshToken);
authRouter.post('/logout', validateRequest(logoutSchema), logout);

export { authRouter };
