import { prisma } from '../../../config';
import { ApiError, logger } from '../../../utils';

export const removeStudentFromBatchService = async (
  batchId: string,
  studentId: string,
  adminUserId: string,
): Promise<{ message: string; batchId: string; studentId: string }> => {
  const enrollment = await prisma.enrollment.findUnique({
    where: {
      batchId_studentId: {
        batchId,
        studentId,
      },
    },
  });

  if (!enrollment) {
    throw ApiError.notFound('Student is not enrolled in this batch.');
  }

  await prisma.enrollment.delete({
    where: {
      id: enrollment.id,
    },
  });

  logger.audit('STUDENT_REMOVED_FROM_BATCH', {
    enrollmentId: enrollment.id,
    batchId,
    studentId,
    removedBy: adminUserId,
  });

  return {
    message: 'Student successfully removed from batch',
    batchId,
    studentId,
  };
};
