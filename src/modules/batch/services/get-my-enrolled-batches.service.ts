import { prisma } from '../../../config';
import type { IEnrollmentResponse } from '../batch.interface';
import { formatEnrollmentResponse } from '../batch.utils';

export const getMyEnrolledBatchesService = async (
  studentUserId: string,
): Promise<IEnrollmentResponse[]> => {
  const enrollments = await prisma.enrollment.findMany({
    where: {
      studentId: studentUserId,
      batch: {
        deletedAt: null,
      },
    },
    include: {
      batch: {
        include: {
          routines: {
            include: {
              teacher: {
                include: {
                  teacherProfile: true,
                },
              },
            },
            orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
          },
        },
      },
    },
    orderBy: {
      enrolledAt: 'desc',
    },
  });

  return enrollments.map(formatEnrollmentResponse);
};
