import type { DayOfWeek } from '@prisma/client';

export interface ICreateRoutineInput {
  batchId: string;
  dayOfWeek: DayOfWeek;
  startTime: string; // e.g. "10:00"
  endTime: string; // e.g. "11:30"
  subject?: string;
  room?: string;
  teacherId?: string;
}

export interface IUpdateRoutineInput {
  dayOfWeek?: DayOfWeek;
  startTime?: string;
  endTime?: string;
  subject?: string;
  room?: string;
  teacherId?: string | null;
}

export interface IRoutineQuery {
  page?: number | string;
  limit?: number | string;
  search?: string;
  batchId?: string;
  dayOfWeek?: DayOfWeek;
  teacherId?: string;
  room?: string;
  subject?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface IRoutineTeacherSummary {
  id: string;
  name: string;
  email: string;
  phone: string;
  designation: string | null;
  specialization: string | null;
}

export interface IRoutineBatchSummary {
  id: string;
  name: string;
  fee: number;
}

export interface IRoutineResponse {
  id: string;
  batchId: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  subject: string | null;
  room: string | null;
  teacherId: string | null;
  teacher?: IRoutineTeacherSummary | null;
  batch?: IRoutineBatchSummary | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IDayTimetableGroup {
  dayOfWeek: DayOfWeek;
  slots: IRoutineResponse[];
}

export interface ITimetableResponse {
  batch?: IRoutineBatchSummary;
  totalSlots: number;
  schedule: IDayTimetableGroup[];
}

export interface ITeacherScheduleResponse {
  teacher: IRoutineTeacherSummary;
  totalSlots: number;
  schedule: IDayTimetableGroup[];
}

export interface IStudentScheduleResponse {
  studentId: string;
  totalSlots: number;
  enrolledBatchesCount: number;
  schedule: IDayTimetableGroup[];
}
