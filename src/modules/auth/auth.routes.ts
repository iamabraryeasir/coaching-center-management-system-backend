import { Role } from '@prisma/client';
import { Router } from 'express';
import { checkAuth, validateRequest } from '../../middlewares';
import {
  approveStudent,
  forgotPassword,
  getPendingStudents,
  googleLogin,
  googleOnboard,
  login,
  logout,
  refreshToken,
  registerStudent,
  registerTeacher,
  rejectStudent,
  resetPassword,
} from './auth.controller';
import {
  forgotPasswordSchema,
  getPendingStudentsSchema,
  googleLoginSchema,
  googleOnboardSchema,
  loginSchema,
  logoutSchema,
  refreshTokenSchema,
  registerStudentSchema,
  registerTeacherSchema,
  resetPasswordSchema,
  studentIdParamSchema,
} from './auth.validation';

const authRouter: Router = Router();

/**
 * Direct Student Registration (Protected — ADMIN only)
 */
authRouter.post(
  '/register-student',
  checkAuth(Role.ADMIN),
  validateRequest(registerStudentSchema),
  registerStudent,
);

/**
 * Direct Teacher Registration (Protected — ADMIN only)
 */
authRouter.post(
  '/register-teacher',
  checkAuth(Role.ADMIN),
  validateRequest(registerTeacherSchema),
  registerTeacher,
);

/**
 * View Pending Student Applications (Protected — ADMIN only)
 */
authRouter.get(
  '/pending-students',
  checkAuth(Role.ADMIN),
  validateRequest(getPendingStudentsSchema),
  getPendingStudents,
);

/**
 * Approve Pending Student Application (Protected — ADMIN only)
 */
authRouter.patch(
  '/pending-students/:id/approve',
  checkAuth(Role.ADMIN),
  validateRequest(studentIdParamSchema),
  approveStudent,
);

/**
 * Reject Pending Student Application (Protected — ADMIN only)
 */
authRouter.patch(
  '/pending-students/:id/reject',
  checkAuth(Role.ADMIN),
  validateRequest(studentIdParamSchema),
  rejectStudent,
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

/**
 * Google Identity Services (GIS) token verification / student login
 */
authRouter.post('/google', validateRequest(googleLoginSchema), googleLogin);

/**
 * Submit onboarding details for Google-authenticated student (PENDING_ACTIVATION)
 */
authRouter.post('/google/onboard', validateRequest(googleOnboardSchema), googleOnboard);

export { authRouter };
