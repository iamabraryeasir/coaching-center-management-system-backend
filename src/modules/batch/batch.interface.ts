import type { BatchStatus, DayOfWeek, EnrollmentStatus } from '@prisma/client';

export interface ICreateBatchInput {
  name: string;
  fee: number;
  status?: BatchStatus;
}

export interface IUpdateBatchInput {
  name?: string;
  fee?: number;
  status?: BatchStatus;
}

export interface IBatchQuery {
  page?: number | string;
  limit?: number | string;
  search?: string;
  status?: BatchStatus;
  fee_gte?: number | string;
  fee_lte?: number | string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface IAdminDirectEnrollInput {
  studentId: string;
}

export interface IPendingEnrollmentsQuery {
  page?: number | string;
  limit?: number | string;
  search?: string;
  batchId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface IBatchStudentsQuery {
  page?: number | string;
  limit?: number | string;
  search?: string;
  status?: EnrollmentStatus;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface IClassRoutineItem {
  id: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  subject: string | null;
  room: string | null;
  teacher: {
    id: string;
    name: string;
    email: string;
    phone: string;
    designation: string | null;
  } | null;
}

export interface IBatchResponse {
  id: string;
  name: string;
  fee: number;
  status: BatchStatus;
  enrolledStudentsCount: number;
  pendingEnrollmentsCount?: number;
  routines?: IClassRoutineItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IEnrollmentStudentInfo {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatarUrl: string | null;
  studentProfile: {
    guardianName: string;
    guardianPhone: string;
    institutionName: string | null;
    classLevel: string;
    rollNumber: string | null;
  } | null;
}

export interface IEnrollmentResponse {
  id: string;
  studentId: string;
  batchId: string;
  status: EnrollmentStatus;
  enrolledAt: Date;
  approvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  student?: IEnrollmentStudentInfo;
  batch?: {
    id: string;
    name: string;
    fee: number;
    status: BatchStatus;
  };
}
