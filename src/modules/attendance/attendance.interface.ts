import type { AttendanceStatus } from '@prisma/client';

export interface IBulkAttendanceRecordItem {
  studentId: string;
  status: AttendanceStatus;
  remarks?: string;
}

export interface IBulkAttendanceInput {
  date: string; // "YYYY-MM-DD"
  records: IBulkAttendanceRecordItem[];
}

export interface IUpdateAttendanceInput {
  status: AttendanceStatus;
  remarks?: string;
}

export interface IAttendanceQuery {
  page?: number | string;
  limit?: number | string;
  search?: string;
  batchId?: string;
  studentId?: string;
  status?: AttendanceStatus;
  date?: string; // "YYYY-MM-DD"
  startDate?: string; // "YYYY-MM-DD"
  endDate?: string; // "YYYY-MM-DD"
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface IAttendanceStudentSummary {
  id: string;
  name: string;
  email: string;
  phone: string;
  rollNumber: string | null;
  classLevel: string | null;
}

export interface IAttendanceMarkerSummary {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface IAttendanceRecordResponse {
  id: string;
  batchId: string;
  studentId: string;
  markedById: string;
  date: string; // "YYYY-MM-DD"
  status: AttendanceStatus;
  remarks: string | null;
  createdAt: Date;
  updatedAt: Date;
  student?: IAttendanceStudentSummary | null;
  batch?: {
    id: string;
    name: string;
  } | null;
  markedBy?: IAttendanceMarkerSummary | null;
}

export interface IAttendanceStats {
  totalSessions: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  excusedCount: number;
  leaveCount: number;
  attendanceRate: number; // percentage rounded to 2 decimals e.g. 95.5
}

export interface IBatchAttendanceReportResponse {
  batchId: string;
  batchName: string;
  dateFilter?: string;
  startDate?: string;
  endDate?: string;
  stats: IAttendanceStats;
  records: IAttendanceRecordResponse[];
}

export interface IStudentAttendanceSummaryResponse {
  studentId: string;
  studentName: string;
  stats: IAttendanceStats;
  recentRecords: IAttendanceRecordResponse[];
}

export interface IBulkTeacherAttendanceItem {
  teacherId: string;
  status: AttendanceStatus;
  remarks?: string;
}

export interface IBulkTeacherAttendanceInput {
  date: string; // "YYYY-MM-DD"
  records: IBulkTeacherAttendanceItem[];
}

export interface ISelfCheckInTeacherInput {
  remarks?: string;
}

export interface IUpdateTeacherAttendanceInput {
  status: AttendanceStatus;
  remarks?: string;
}

export interface ITeacherAttendanceQuery {
  page?: number | string;
  limit?: number | string;
  search?: string;
  teacherId?: string;
  status?: AttendanceStatus;
  date?: string; // "YYYY-MM-DD"
  startDate?: string; // "YYYY-MM-DD"
  endDate?: string; // "YYYY-MM-DD"
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ITeacherAttendanceTeacherSummary {
  id: string;
  name: string;
  email: string;
  phone: string;
  designation: string | null;
  specialization: string | null;
}

export interface ITeacherAttendanceRecordResponse {
  id: string;
  teacherId: string;
  markedById: string;
  date: string; // "YYYY-MM-DD"
  status: AttendanceStatus;
  checkInTime: Date | null;
  remarks: string | null;
  createdAt: Date;
  updatedAt: Date;
  teacher?: ITeacherAttendanceTeacherSummary | null;
  markedBy?: IAttendanceMarkerSummary | null;
}

export interface ITeacherAttendanceReportResponse {
  dateFilter?: string;
  startDate?: string;
  endDate?: string;
  stats: IAttendanceStats;
  records: ITeacherAttendanceRecordResponse[];
}

export interface ITeacherAttendanceSummaryResponse {
  teacherId: string;
  teacherName: string;
  stats: IAttendanceStats;
  recentRecords: ITeacherAttendanceRecordResponse[];
}
