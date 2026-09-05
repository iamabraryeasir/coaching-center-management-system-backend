import type { Batch, Exam, ExamResult, StudentProfile, User } from '@prisma/client';
import { format, parseISO, startOfDay } from 'date-fns';
import type { IExamResponse, IExamResultItemResponse, IExamStatistics } from './exam.interface';

type RawExamWithRelations = Exam & {
  batch?: (Batch & { fee?: { toString(): string } | number }) | null;
  results?: ExamResult[];
};

type RawExamResultWithRelations = ExamResult & {
  student?: (User & { studentProfile?: StudentProfile | null }) | null;
  exam?: Exam | null;
};

/**
 * Normalizes a YYYY-MM-DD date string into a Date object representing UTC calendar day start
 */
export const normalizeExamDateToUtc = (dateStr: string): Date => {
  return startOfDay(parseISO(`${dateStr}T00:00:00.000Z`));
};

/**
 * Formats a Date object to YYYY-MM-DD string using date-fns
 */
export const formatExamDateToString = (date: Date): string => {
  return format(date, 'yyyy-MM-dd');
};

/**
 * Calculates standardized letter grade based on percentage and pass marks
 */
export const calculateGrade = (
  marksObtained: number,
  totalMarks: number,
  passMarks: number,
): string => {
  if (marksObtained < passMarks) {
    return 'F';
  }

  if (totalMarks <= 0) {
    return 'F';
  }

  const percentage = (marksObtained / totalMarks) * 100;

  if (percentage >= 80) {
    return 'A+';
  }
  if (percentage >= 70) {
    return 'A';
  }
  if (percentage >= 60) {
    return 'A-';
  }
  if (percentage >= 50) {
    return 'B';
  }
  if (percentage >= 40) {
    return 'C';
  }
  if (percentage >= 33) {
    return 'D';
  }
  return 'F';
};

/**
 * Calculates aggregate exam performance statistics
 */
export const calculateExamStatistics = (
  results: Array<{ marksObtained: { toString(): string } | number }>,
  _totalMarks: number,
  passMarks: number,
): IExamStatistics => {
  if (results.length === 0) {
    return {
      totalCandidates: 0,
      evaluatedCount: 0,
      highestMark: 0,
      lowestMark: 0,
      averageMark: 0,
      passCount: 0,
      failCount: 0,
      passRate: 0,
    };
  }

  const numericMarks = results.map((r) => Number(r.marksObtained));
  const evaluatedCount = numericMarks.length;
  const highestMark = Math.max(...numericMarks);
  const lowestMark = Math.min(...numericMarks);
  const sum = numericMarks.reduce((acc, val) => acc + val, 0);
  const averageMark = Number((sum / evaluatedCount).toFixed(2));

  let passCount = 0;
  let failCount = 0;

  for (const mark of numericMarks) {
    if (mark >= passMarks) {
      passCount++;
    } else {
      failCount++;
    }
  }

  const passRate = evaluatedCount > 0 ? Number(((passCount / evaluatedCount) * 100).toFixed(2)) : 0;

  return {
    totalCandidates: evaluatedCount,
    evaluatedCount,
    highestMark: Number(highestMark.toFixed(2)),
    lowestMark: Number(lowestMark.toFixed(2)),
    averageMark,
    passCount,
    failCount,
    passRate,
  };
};

/**
 * Formats a Prisma Exam entity into a sanitized API response object
 */
export const formatExamResponse = (
  exam: RawExamWithRelations,
  stats?: IExamStatistics | null,
): IExamResponse => {
  return {
    id: exam.id,
    batchId: exam.batchId,
    title: exam.title,
    description: exam.description,
    totalMarks: Number(exam.totalMarks),
    passMarks: Number(exam.passMarks),
    examDate: formatExamDateToString(exam.examDate),
    status: exam.status,
    resultStatus: exam.resultStatus,
    createdAt: exam.createdAt,
    updatedAt: exam.updatedAt,
    batch: exam.batch
      ? {
          id: exam.batch.id,
          name: exam.batch.name,
          fee: Number(exam.batch.fee),
        }
      : null,
    stats: stats !== undefined ? stats : null,
  };
};

/**
 * Formats a Prisma ExamResult entity into a sanitized API response item
 */
export const formatExamResultResponse = (
  result: RawExamResultWithRelations,
  totalMarks: number,
  passMarks: number,
  rank?: number,
): IExamResultItemResponse => {
  const marksObtained = Number(result.marksObtained);
  const percentage = totalMarks > 0 ? Number(((marksObtained / totalMarks) * 100).toFixed(2)) : 0;
  const isPassed = marksObtained >= passMarks;
  const grade = result.grade || calculateGrade(marksObtained, totalMarks, passMarks);

  return {
    id: result.id,
    examId: result.examId,
    studentId: result.studentId,
    marksObtained,
    grade,
    percentage,
    isPassed,
    remarks: result.remarks,
    rank,
    createdAt: result.createdAt,
    updatedAt: result.updatedAt,
    student: result.student
      ? {
          id: result.student.id,
          name: result.student.name,
          email: result.student.email,
          phone: result.student.phone,
          rollNumber: result.student.studentProfile?.rollNumber ?? null,
          classLevel: result.student.studentProfile?.classLevel ?? null,
        }
      : null,
  };
};
