import type { ExamStatus, ResultStatus } from '@prisma/client';

export interface ICreateExamInput {
  batchId: string;
  title: string;
  description?: string;
  totalMarks: number;
  passMarks: number;
  examDate: string; // "YYYY-MM-DD"
  status?: ExamStatus;
}

export interface IUpdateExamInput {
  title?: string;
  description?: string;
  totalMarks?: number;
  passMarks?: number;
  examDate?: string; // "YYYY-MM-DD"
  status?: ExamStatus;
}

export interface IBulkMarkItem {
  studentId: string;
  marksObtained: number;
  grade?: string;
  remarks?: string;
}

export interface IBulkMarksInput {
  records: IBulkMarkItem[];
}

export interface IUpdateStudentMarkInput {
  marksObtained: number;
  grade?: string;
  remarks?: string;
}

export interface IExamQuery {
  page?: number | string;
  limit?: number | string;
  search?: string;
  batchId?: string;
  status?: ExamStatus;
  resultStatus?: ResultStatus;
  examDate?: string; // "YYYY-MM-DD"
  startDate?: string; // "YYYY-MM-DD"
  endDate?: string; // "YYYY-MM-DD"
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface IExamStudentSummary {
  id: string;
  name: string;
  email: string;
  phone: string;
  rollNumber: string | null;
  classLevel: string | null;
}

export interface IExamResultItemResponse {
  id: string;
  examId: string;
  studentId: string;
  marksObtained: number;
  grade: string | null;
  percentage: number;
  isPassed: boolean;
  remarks: string | null;
  rank?: number;
  createdAt: Date;
  updatedAt: Date;
  student?: IExamStudentSummary | null;
}

export interface IExamResponse {
  id: string;
  batchId: string;
  title: string;
  description: string | null;
  totalMarks: number;
  passMarks: number;
  examDate: string; // "YYYY-MM-DD"
  status: ExamStatus;
  resultStatus: ResultStatus;
  createdAt: Date;
  updatedAt: Date;
  batch?: {
    id: string;
    name: string;
    fee: number;
  } | null;
  stats?: IExamStatistics | null;
}

export interface IExamStatistics {
  totalCandidates: number;
  evaluatedCount: number;
  highestMark: number;
  lowestMark: number;
  averageMark: number;
  passCount: number;
  failCount: number;
  passRate: number; // percentage e.g. 85.5%
}

export interface IBatchExamResultsReportResponse {
  exam: IExamResponse;
  stats: IExamStatistics;
  results: IExamResultItemResponse[];
}

export interface IStudentReportCardResponse {
  student: IExamStudentSummary;
  totalExams: number;
  passedExams: number;
  failedExams: number;
  overallPassRate: number;
  results: Array<{
    exam: IExamResponse;
    result: IExamResultItemResponse;
  }>;
}
