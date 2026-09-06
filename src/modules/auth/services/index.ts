import { requestPasswordReset } from './forgot-password.service';
import { getUserSessionsService } from './get-sessions.service';
import { loginWithGoogle } from './google-login.service';
import { onboardGoogleStudent } from './google-onboard.service';
import { loginUser } from './login.service';
import { logoutUser } from './logout.service';
import { logoutAllDevicesService } from './logout-all.service';
import { registerStudentAccount } from './register.service';
import { registerTeacherAccount } from './register-teacher.service';
import { resetUserPassword } from './reset-password.service';
import {
  approveStudentService,
  getPendingStudentsService,
  rejectStudentService,
} from './review-student.service';
import { refreshUserTokens } from './token.service';

export * from './forgot-password.service';
export * from './get-sessions.service';
export * from './google-login.service';
export * from './google-onboard.service';
export * from './login.service';
export * from './logout.service';
export * from './logout-all.service';
export * from './register.service';
export * from './register-teacher.service';
export * from './reset-password.service';
export * from './review-student.service';
export * from './token.service';

/**
 * Functional Service Bundle
 */
export const authService = Object.freeze({
  registerStudentAccount,
  registerTeacherAccount,
  getPendingStudents: getPendingStudentsService,
  approveStudent: approveStudentService,
  rejectStudent: rejectStudentService,
  loginUser,
  refreshUserTokens,
  logoutUser,
  logoutAllDevices: logoutAllDevicesService,
  getUserSessions: getUserSessionsService,
  requestPasswordReset,
  resetUserPassword,
  loginWithGoogle,
  onboardGoogleStudent,
});
