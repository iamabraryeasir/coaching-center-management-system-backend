import { prisma } from '../../../config';
import { ApiError, generateReportCardPdfBuffer, sendReportCardEmail } from '../../../utils';
import { calculateGrade } from '../exam.utils';

export const sendStudentReportCardEmailService = async (
  examId: string,
  studentId: string,
): Promise<{ message: string }> => {
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

  const subject = exam.description || exam.title;

  const pdfBuffer = await generateReportCardPdfBuffer({
    student: result.student,
    exam: {
      id: exam.id,
      title: exam.title,
      subject,
      examDate: exam.examDate,
      totalMarks,
      batchName: exam.batch.name,
    },
    result: {
      marksObtained,
      percentage,
      grade,
      gpa,
      isPassed,
      remarks: result.remarks,
    },
  });

  await sendReportCardEmail(
    result.student.email,
    result.student.name,
    exam.title,
    subject,
    grade,
    gpa,
    pdfBuffer,
  );

  return {
    message: `Official report card PDF successfully emailed to ${result.student.email}`,
  };
};
