import type { Gender, Permission, Role, UserStatus } from '@prisma/client';
import type { IInstitutionSummary } from '../institution';

export interface IUpdateMyProfileInput {
  name?: string;
  phone?: string;
  gender?: Gender | null;
  avatarUrl?: string | null;
  // Student Profile fields
  guardianName?: string;
  guardianPhone?: string;
  institutionName?: string | null;
  classLevel?: string;
  rollNumber?: string | null;
  // Teacher Profile fields
  designation?: string;
  qualification?: string;
  specialization?: string;
}

export interface IChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export interface IUserQuery {
  search?: string;
  searchTerm?: string;
  role?: Role;
  status?: UserStatus;
  page?: string | number;
  limit?: string | number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface IUpdateUserStatusInput {
  status: UserStatus;
  reason?: string;
}

export interface IUpdateTeacherPermissionsInput {
  permissions: Permission[];
}

export interface IStudentProfileData {
  id: string;
  guardianName: string;
  guardianPhone: string;
  institutionName: string | null;
  classLevel: string;
  rollNumber: string | null;
}

export interface ITeacherProfileData {
  id: string;
  designation: string;
  qualification: string;
  specialization: string;
  joiningDate: Date | null;
}

export interface IAdminProfileData {
  id: string;
  institutionName: string;
  institutionAddress: string;
  institutionPhone: string | null;
  institutionEmail: string | null;
}

export interface IUserProfileResponse {
  id: string;
  name: string;
  email: string;
  phone: string;
  gender: Gender | null;
  avatarUrl: string | null;
  role: Role;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
  studentProfile?: IStudentProfileData | null;
  teacherProfile?: ITeacherProfileData | null;
  teacherPermissions?: Permission[];
  adminProfile?: IAdminProfileData | null;
  institution?: IInstitutionSummary | null;
}
