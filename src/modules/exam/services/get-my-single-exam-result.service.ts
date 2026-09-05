import { ResultStatus } from '@prisma/client';
import { prisma } from '../../../config';
import { ApiError } from '../../../utils';
import type { IExamResponse, IExamResultItemResponse, IExamStatistics } from '../exam.interface';
import {
  calculateExamStatistics,
  formatExamResponse,
  formatExamResultResponse,
} from '../exam.utils';

export const getMySingleExamResultService = async (
  examId: string,
  studentId: string,
): Promise<{
  exam: IExamResponse;
  result: IExamResultItemResponse;
  stats: IExamStatistics;
}> => {
  const exam = await prisma.exam.findFirst({
    where: {
      id: examId,
      resultStatus: ResultStatus.PUBLISHED,
      batch: {
        deletedAt: null,
      },
    },
    include: {
      batch: true,
    },
  });

  if (!exam) {
    throw ApiError.notFound('Exam not found or results have not been published yet');
  }

  const allResults = await prisma.examResult.findMany({
    where: {
      examId,
      student: {
        deletedAt: null,
      },
    },
    orderBy: {
      marksObtained: 'desc',
    },
    include: {
      student: {
        include: {
          studentProfile: true,
        },
      },
    },
  });

  const totalMarksNum = Number(exam.totalMarks);
  const passMarksNum = Number(exam.passMarks);
  const stats = calculateExamStatistics(allResults, totalMarksNum, passMarksNum);

  const studentResultIndex = allResults.findIndex((r) => r.studentId === studentId);
  const studentResult = studentResultIndex !== -1 ? allResults[studentResultIndex] : undefined;

  if (studentResultIndex === -1 || !studentResult) {
    throw ApiError.notFound('Your result for this exam was not found.');
  }

  const rank = studentResultIndex + 1;

  return {
    exam: formatExamResponse(exam, stats),
    result: formatExamResultResponse(studentResult, totalMarksNum, passMarksNum, rank),
    stats,
  };
};
