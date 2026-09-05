import { Permission, Role } from '@prisma/client';
import { prisma } from '../../../config';
import { ApiError, logger } from '../../../utils';
import type { IExamResultItemResponse, IUpdateStudentMarkInput } from '../exam.interface';
import { calculateGrade, formatExamResultResponse } from '../exam.utils';

export const updateStudentMarkService = async (
  examId: string,
  studentId: string,
  input: IUpdateStudentMarkInput,
  actorUserId: string,
  actorRole: Role,
): Promise<IExamResultItemResponse> => {
  // 1. Permission check for Teacher
  if (actorRole === Role.TEACHER) {
    const hasPerm = await prisma.teacherPermission.findUnique({
      where: {
        teacherId_permission: {
          teacherId: actorUserId,
          permission: Permission.MANAGE_EXAMS,
        },
      },
    });

    if (!hasPerm) {
      throw ApiError.forbidden(
        'You lack the MANAGE_EXAMS permission required to correct student marks.',
      );
    }
  }

  // 2. Verify exam and student result exist
  const exam = await prisma.exam.findFirst({
    where: {
      id: examId,
      batch: {
        deletedAt: null,
      },
    },
  });

  if (!exam) {
    throw ApiError.notFound('Exam not found');
  }

  const totalMarksNum = Number(exam.totalMarks);
  const passMarksNum = Number(exam.passMarks);

  if (input.marksObtained > totalMarksNum) {
    throw ApiError.badRequest(
      `Marks obtained (${input.marksObtained}) cannot exceed total marks (${totalMarksNum}).`,
    );
  }

  const existingResult = await prisma.examResult.findUnique({
    where: {
      examId_studentId: {
        examId,
        studentId,
      },
    },
  });

  if (!existingResult) {
    throw ApiError.notFound('Exam result for this student was not found');
  }

  const previousMarks = Number(existingResult.marksObtained);
  const computedGrade =
    input.grade || calculateGrade(input.marksObtained, totalMarksNum, passMarksNum);

  // 3. Update exam result
  const updatedResult = await prisma.examResult.update({
    where: {
      examId_studentId: {
        examId,
        studentId,
      },
    },
    data: {
      marksObtained: input.marksObtained,
      grade: computedGrade,
      remarks: input.remarks !== undefined ? input.remarks : existingResult.remarks,
    },
    include: {
      student: {
        include: {
          studentProfile: true,
        },
      },
    },
  });

  logger.audit('EXAM_MARK_CORRECTED', {
    examId,
    studentId,
    previousMarks,
    newMarks: input.marksObtained,
    previousGrade: existingResult.grade,
    newGrade: computedGrade,
    correctedBy: actorUserId,
  });

  return formatExamResultResponse(updatedResult, totalMarksNum, passMarksNum);
};
