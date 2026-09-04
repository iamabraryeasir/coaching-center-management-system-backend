import { requestPasswordReset } from './forgot-password.service';
import { loginUser } from './login.service';
import { logoutUser } from './logout.service';
import { registerStudentAccount } from './register.service';
import { resetUserPassword } from './reset-password.service';
import { refreshUserTokens } from './token.service';

export * from './forgot-password.service';
export * from './login.service';
export * from './logout.service';
export * from './register.service';
export * from './reset-password.service';
export * from './token.service';

/**
 * Functional Service Bundle
 */
export const authService = Object.freeze({
  registerStudentAccount,
  loginUser,
  refreshUserTokens,
  logoutUser,
  requestPasswordReset,
  resetUserPassword,
});
