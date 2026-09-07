import {
  type AdminProfile,
  type Gender,
  type Permission,
  Role,
  type StudentProfile,
  type TeacherProfile,
  type User,
} from '@prisma/client';
import { prisma } from '../../config';
import type { IInstitutionSummary } from '../institution';
import type { IUpdateMyProfileInput, IUserProfileResponse } from './user.interface';

export const formatUserProfile = (
  user: User & {
    studentProfile?: StudentProfile | null;
    teacherProfile?: TeacherProfile | null;
    teacherPermissions?: { permission: Permission }[];
    adminProfile?: AdminProfile | null;
  },
  institutionSummary?: IInstitutionSummary | null,
): IUserProfileResponse => {
  const base: IUserProfileResponse = {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    gender: user.gender || null,
    avatarUrl: user.avatarUrl,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };

  if (user.role === Role.ADMIN) {
    base.adminProfile = user.adminProfile
      ? {
          id: user.adminProfile.id,
          institutionName: user.adminProfile.institutionName,
          institutionAddress: user.adminProfile.institutionAddress,
          institutionPhone: user.adminProfile.institutionPhone,
          institutionEmail: user.adminProfile.institutionEmail,
        }
      : null;
  } else if (user.role === Role.STUDENT) {
    base.studentProfile = user.studentProfile
      ? {
          id: user.studentProfile.id,
          guardianName: user.studentProfile.guardianName,
          guardianPhone: user.studentProfile.guardianPhone,
          institutionName: user.studentProfile.institutionName,
          classLevel: user.studentProfile.classLevel,
          rollNumber: user.studentProfile.rollNumber,
        }
      : null;
    base.institution = institutionSummary || null;
  } else if (user.role === Role.TEACHER) {
    base.teacherProfile = user.teacherProfile
      ? {
          id: user.teacherProfile.id,
          designation: user.teacherProfile.designation,
          qualification: user.teacherProfile.qualification,
          specialization: user.teacherProfile.specialization,
          joiningDate: user.teacherProfile.joiningDate,
        }
      : null;
    base.teacherPermissions = user.teacherPermissions?.map((p) => p.permission) || [];
    base.institution = institutionSummary || null;
  }

  return base;
};

export const fetchInstitutionSummary = async (): Promise<IInstitutionSummary | null> => {
  const adminUser = await prisma.user.findFirst({
    where: { role: Role.ADMIN, deletedAt: null },
    include: { adminProfile: true },
  });

  if (!adminUser?.adminProfile) {
    return null;
  }

  return {
    name: adminUser.adminProfile.institutionName,
    address: adminUser.adminProfile.institutionAddress,
    phone: adminUser.adminProfile.institutionPhone,
    email: adminUser.adminProfile.institutionEmail,
  };
};

export const extractBaseUserUpdates = (payload: IUpdateMyProfileInput) => {
  const baseData: {
    name?: string;
    phone?: string;
    gender?: Gender | null;
    avatarUrl?: string | null;
  } = {};
  if (payload.name !== undefined) {
    baseData.name = payload.name;
  }
  if (payload.phone !== undefined) {
    baseData.phone = payload.phone;
  }
  if (payload.gender !== undefined) {
    baseData.gender = payload.gender;
  }
  if (payload.avatarUrl !== undefined) {
    baseData.avatarUrl = payload.avatarUrl;
  }
  return baseData;
};

export const extractStudentProfileUpdates = (payload: IUpdateMyProfileInput) => {
  const studentData: {
    guardianName?: string;
    guardianPhone?: string;
    institutionName?: string | null;
    classLevel?: string;
    rollNumber?: string | null;
  } = {};
  if (payload.guardianName !== undefined) {
    studentData.guardianName = payload.guardianName;
  }
  if (payload.guardianPhone !== undefined) {
    studentData.guardianPhone = payload.guardianPhone;
  }
  if (payload.institutionName !== undefined) {
    studentData.institutionName = payload.institutionName;
  }
  if (payload.classLevel !== undefined) {
    studentData.classLevel = payload.classLevel;
  }
  if (payload.rollNumber !== undefined) {
    studentData.rollNumber = payload.rollNumber;
  }
  return studentData;
};

export const extractTeacherProfileUpdates = (payload: IUpdateMyProfileInput) => {
  const teacherData: {
    designation?: string;
    qualification?: string;
    specialization?: string;
  } = {};
  if (payload.designation !== undefined) {
    teacherData.designation = payload.designation;
  }
  if (payload.qualification !== undefined) {
    teacherData.qualification = payload.qualification;
  }
  if (payload.specialization !== undefined) {
    teacherData.specialization = payload.specialization;
  }
  return teacherData;
};
