import { ResultStatus, Role } from '@prisma/client';
import { prisma } from '../../../config';
import { ApiError } from '../../../utils';
import type { IStudentReportCardResponse } from '../exam.interface';
import { formatExamResponse, formatExamResultResponse } from '../exam.utils';

export const getMyExamResultsService = async (
  studentId: string,
  batchId?: string,
): Promise<IStudentReportCardResponse> => {
  const student = await prisma.user.findFirst({
    where: {
      id: studentId,
      role: Role.STUDENT,
      deletedAt: null,
    },
    include: {
      studentProfile: true,
    },
  });

  if (!student) {
    throw ApiError.notFound('Student not found');
  }

  // Fetch results for published exams only
  const results = await prisma.examResult.findMany({
    where: {
      studentId,
      exam: {
        resultStatus: ResultStatus.PUBLISHED,
        batch: {
          deletedAt: null,
          ...(batchId ? { id: batchId } : {}),
        },
      },
    },
    include: {
      exam: {
        include: {
          batch: true,
        },
      },
    },
    orderBy: {
      exam: {
        examDate: 'desc',
      },
    },
  });

  let passedCount = 0;
  let failedCount = 0;

  const formattedItems = results.map((item) => {
    const totalMarks = Number(item.exam.totalMarks);
    const passMarks = Number(item.exam.passMarks);
    const marksObtained = Number(item.marksObtained);

    if (marksObtained >= passMarks) {
      passedCount++;
    } else {
      failedCount++;
    }

    return {
      exam: formatExamResponse(item.exam),
      result: formatExamResultResponse(item, totalMarks, passMarks),
    };
  });

  const totalExams = results.length;
  const overallPassRate =
    totalExams > 0 ? Number(((passedCount / totalExams) * 100).toFixed(2)) : 0;

  return {
    student: {
      id: student.id,
      name: student.name,
      email: student.email,
      phone: student.phone,
      rollNumber: student.studentProfile?.rollNumber ?? null,
      classLevel: student.studentProfile?.classLevel ?? null,
    },
    totalExams,
    passedExams: passedCount,
    failedExams: failedCount,
    overallPassRate,
    results: formattedItems,
  };
};
