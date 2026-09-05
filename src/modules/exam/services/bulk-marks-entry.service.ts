import { EnrollmentStatus, Permission, Role } from '@prisma/client';
import { prisma } from '../../../config';
import { ApiError, logger } from '../../../utils';
import type { IBatchExamResultsReportResponse, IBulkMarksInput } from '../exam.interface';
import {
  calculateExamStatistics,
  calculateGrade,
  formatExamResponse,
  formatExamResultResponse,
} from '../exam.utils';

export const bulkMarksEntryService = async (
  examId: string,
  input: IBulkMarksInput,
  actorUserId: string,
  actorRole: Role,
): Promise<IBatchExamResultsReportResponse> => {
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
      throw ApiError.forbidden('You lack the MANAGE_EXAMS permission required to submit marks.');
    }
  }

  // 2. Verify exam exists
  const exam = await prisma.exam.findFirst({
    where: {
      id: examId,
      batch: {
        deletedAt: null,
      },
    },
    include: {
      batch: true,
    },
  });

  if (!exam) {
    throw ApiError.notFound('Exam not found');
  }

  const totalMarksNum = Number(exam.totalMarks);
  const passMarksNum = Number(exam.passMarks);

  // 3. Validate student IDs and maximum marks constraint
  const studentIds = [...new Set(input.records.map((r) => r.studentId))];

  for (const record of input.records) {
    if (record.marksObtained > totalMarksNum) {
      throw ApiError.badRequest(
        `Marks obtained (${record.marksObtained}) cannot exceed total marks (${totalMarksNum}) for student ${record.studentId}.`,
      );
    }
  }

  // 4. Verify all students are actively enrolled in this batch
  const enrolledStudents = await prisma.enrollment.findMany({
    where: {
      batchId: exam.batchId,
      studentId: { in: studentIds },
      status: EnrollmentStatus.ENROLLED,
      student: {
        deletedAt: null,
      },
    },
    select: {
      studentId: true,
    },
  });

  const enrolledStudentIdSet = new Set(enrolledStudents.map((e) => e.studentId));
  const invalidStudentIds = studentIds.filter((id) => !enrolledStudentIdSet.has(id));

  if (invalidStudentIds.length > 0) {
    throw ApiError.badRequest(
      `The following student IDs are not actively enrolled in this batch: ${invalidStudentIds.join(', ')}`,
    );
  }

  // 5. Atomic upsert of marks in a Prisma interactive transaction
  const upsertedResults = await prisma.$transaction(async (tx) => {
    const results = [];

    for (const record of input.records) {
      const computedGrade =
        record.grade || calculateGrade(record.marksObtained, totalMarksNum, passMarksNum);

      const upserted = await tx.examResult.upsert({
        where: {
          examId_studentId: {
            examId,
            studentId: record.studentId,
          },
        },
        update: {
          marksObtained: record.marksObtained,
          grade: computedGrade,
          remarks: record.remarks ?? null,
        },
        create: {
          examId,
          studentId: record.studentId,
          marksObtained: record.marksObtained,
          grade: computedGrade,
          remarks: record.remarks ?? null,
        },
        include: {
          student: {
            include: {
              studentProfile: true,
            },
          },
        },
      });

      results.push(upserted);
    }

    return results;
  });

  // 6. Fetch all results for rank calculations and full stats
  const allResults = await prisma.examResult.findMany({
    where: { examId },
    include: {
      student: {
        include: {
          studentProfile: true,
        },
      },
    },
    orderBy: {
      marksObtained: 'desc',
    },
  });

  const stats = calculateExamStatistics(allResults, totalMarksNum, passMarksNum);

  // 7. Audit Log
  logger.audit('EXAM_MARKS_SUBMITTED', {
    examId,
    batchId: exam.batchId,
    marksCount: upsertedResults.length,
    submittedBy: actorUserId,
    highestMark: stats.highestMark,
    passRate: stats.passRate,
  });

  // Format with ranks
  const formattedResults = allResults.map((res, index) =>
    formatExamResultResponse(res, totalMarksNum, passMarksNum, index + 1),
  );

  return {
    exam: formatExamResponse(exam, stats),
    stats,
    results: formattedResults,
  };
};
