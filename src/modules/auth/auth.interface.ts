import type { Permission, Role, UserStatus } from '@prisma/client';

export interface IRegisterStudentInput {
  name: string;
  email: string;
  password: string;
  phone: string;
  adminId?: string; // Branch Admin ID (auto-populated for branch Admins)
  guardianName: string;
  guardianPhone: string;
  institutionName?: string;
  classLevel: string;
  rollNumber?: string;
}

export interface ILoginInput {
  email: string;
  password: string;
}

export interface IRefreshTokenInput {
  refreshToken: string;
}

export interface ILogoutInput {
  refreshToken?: string;
  allDevices?: boolean;
}

export interface IForgotPasswordInput {
  email: string;
}

export interface IResetPasswordInput {
  token: string;
  newPassword: string;
}

export interface IBranchSummary {
  id: string;
  branchName: string;
  branchAddress: string;
  branchPhone: string | null;
}

export interface IStudentProfileSummary {
  id: string;
  guardianName: string;
  guardianPhone: string;
  institutionName: string | null;
  classLevel: string;
  rollNumber: string | null;
}

export interface ITeacherProfileSummary {
  id: string;
  designation: string;
  qualification: string;
  specialization: string;
  joiningDate: Date | null;
}

export interface IAdminProfileSummary {
  id: string;
  branchName: string;
  branchAddress: string;
  branchPhone: string | null;
}

export interface IBaseAuthUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatarUrl: string | null;
  role: Role;
  status: UserStatus;
  createdAt: Date;
}

export interface IStudentAuthUser extends IBaseAuthUser {
  role: 'STUDENT';
  studentProfile: IStudentProfileSummary | null;
  branch: IBranchSummary | null;
}

export interface ITeacherAuthUser extends IBaseAuthUser {
  role: 'TEACHER';
  teacherProfile: ITeacherProfileSummary | null;
  permissions: Permission[];
  branch: IBranchSummary | null;
}

export interface IAdminAuthUser extends IBaseAuthUser {
  role: 'ADMIN';
  adminProfile: IAdminProfileSummary | null;
}

export interface ISuperAdminAuthUser extends IBaseAuthUser {
  role: 'SUPER_ADMIN';
}

export type IAuthUser = IStudentAuthUser | ITeacherAuthUser | IAdminAuthUser | ISuperAdminAuthUser;

export interface IAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // Duration in seconds (e.g. 900 for 15m)
}

export interface ILoginResponse {
  user: IAuthUser;
  tokens: IAuthTokens;
}

export interface ITokenRefreshResponse {
  tokens: IAuthTokens;
}

export interface IClientMetadata {
  ipAddress?: string;
  userAgent?: string;
  deviceName?: string;
  platform?: 'ios' | 'android' | 'web';
}
