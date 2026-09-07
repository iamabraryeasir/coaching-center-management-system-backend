import type { Gender, Permission, Role, UserStatus } from '@prisma/client';
import type { IInstitutionSummary } from '../institution';

export type { IInstitutionSummary };

export interface IRegisterStudentInput {
  name: string;
  email: string;
  password: string;
  phone: string;
  gender?: Gender;
  guardianName: string;
  guardianPhone: string;
  institutionName?: string;
  classLevel: string;
  rollNumber?: string;
}

export interface IRegisterTeacherInput {
  name: string;
  email: string;
  password: string;
  phone: string;
  gender?: Gender;
  designation: string;
  qualification: string;
  specialization: string;
  joiningDate?: string;
  permissions?: Permission[];
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

export interface IGoogleLoginInput {
  idToken: string;
}

export interface IGoogleOnboardInput {
  googleId: string;
  email: string;
  name: string;
  phone: string;
  gender?: Gender;
  guardianName: string;
  guardianPhone: string;
  institutionName?: string;
  classLevel: string;
  rollNumber?: string;
  avatarUrl?: string;
}

export interface IPendingStudentQuery {
  search?: string;
  searchTerm?: string;
  page?: string | number;
  limit?: string | number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface IPendingStudentItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  gender: Gender | null;
  avatarUrl: string | null;
  status: UserStatus;
  createdAt: Date;
  studentProfile: IStudentProfileSummary | null;
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
  institutionName: string;
  institutionAddress: string;
  institutionPhone: string | null;
  institutionEmail: string | null;
}

export interface IBaseAuthUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  gender: Gender | null;
  avatarUrl: string | null;
  role: Role;
  status: UserStatus;
  createdAt: Date;
}

export interface IStudentAuthUser extends IBaseAuthUser {
  role: 'STUDENT';
  studentProfile: IStudentProfileSummary | null;
  institution: IInstitutionSummary | null;
}

export interface ITeacherAuthUser extends IBaseAuthUser {
  role: 'TEACHER';
  teacherProfile: ITeacherProfileSummary | null;
  permissions: Permission[];
  institution: IInstitutionSummary | null;
}

export interface IAdminAuthUser extends IBaseAuthUser {
  role: 'ADMIN';
  adminProfile: IAdminProfileSummary | null;
}

export type IAuthUser = IStudentAuthUser | ITeacherAuthUser | IAdminAuthUser;

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

export type IGoogleLoginResponse =
  | {
      isNewUser: true;
      googleId: string;
      email: string;
      name: string;
      avatarUrl?: string | null;
    }
  | {
      isNewUser: false;
      user: IAuthUser;
      tokens: IAuthTokens;
    };

export interface IGoogleOnboardResponse {
  user: IAuthUser;
  message: string;
}

export interface IClientMetadata {
  ipAddress?: string;
  userAgent?: string;
  deviceName?: string;
  platform?: 'ios' | 'android' | 'web';
}
