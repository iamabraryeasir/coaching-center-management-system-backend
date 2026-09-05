import { ResultStatus, Role } from '@prisma/client';
import { prisma } from '../../../config';
import { ApiError, generateReportCardPdfBuffer } from '../../../utils';
import { calculateGrade } from '../exam.utils';

export const getStudentReportCardPdfService = async (
  examId: string,
  studentId: string,
  requestingUserId: string,
  requestingUserRole: Role,
): Promise<{ buffer: Buffer; filename: string }> => {
  if (requestingUserRole === Role.STUDENT && requestingUserId !== studentId) {
    throw ApiError.forbidden("You are not authorized to view another student's report card");
  }

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: {
      batch: { select: { id: true, name: true } },
    },
  });

  if (!exam) {
    throw ApiError.notFound('Exam assessment not found');
  }

  const result = await prisma.examResult.findUnique({
    where: {
      examId_studentId: {
        examId,
        studentId,
      },
    },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!result) {
    throw ApiError.notFound('Exam result not found for this student');
  }

  if (exam.resultStatus !== ResultStatus.PUBLISHED && requestingUserRole === Role.STUDENT) {
    throw ApiError.forbidden('Exam results for this assessment have not been published yet');
  }

  const highestResult = await prisma.examResult.findFirst({
    where: { examId },
    orderBy: { marksObtained: 'desc' },
    select: { marksObtained: true },
  });

  const totalMarks = Number(exam.totalMarks);
  const passMarks = Number(exam.passMarks);
  const marksObtained = Number(result.marksObtained);
  const percentage = totalMarks > 0 ? Number(((marksObtained / totalMarks) * 100).toFixed(2)) : 0;
  const isPassed = marksObtained >= passMarks;
  const grade = result.grade || calculateGrade(marksObtained, totalMarks, passMarks);

  const getGpa = (g: string): number => {
    switch (g) {
      case 'A+':
        return 5.0;
      case 'A':
        return 4.0;
      case 'A-':
        return 3.5;
      case 'B':
        return 3.0;
      case 'C':
        return 2.0;
      case 'D':
        return 1.0;
      default:
        return 0.0;
    }
  };
  const gpa = getGpa(grade);

  const pdfBuffer = await generateReportCardPdfBuffer({
    student: result.student,
    exam: {
      id: exam.id,
      title: exam.title,
      subject: exam.description || exam.title,
      examDate: exam.examDate,
      totalMarks,
      batchName: exam.batch.name,
    },
    result: {
      marksObtained,
      highestMarksInBatch: highestResult ? Number(highestResult.marksObtained) : undefined,
      percentage,
      grade,
      gpa,
      isPassed,
      remarks: result.remarks,
    },
  });

  const sanitizedTitle = exam.title.replace(/[^a-zA-Z0-9]/g, '_');
  const sanitizedStudent = result.student.name.replace(/[^a-zA-Z0-9]/g, '_');

  return {
    buffer: pdfBuffer,
    filename: `ReportCard-${sanitizedTitle}-${sanitizedStudent}.pdf`,
  };
};
