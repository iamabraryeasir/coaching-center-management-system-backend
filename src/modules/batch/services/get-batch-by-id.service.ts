import { EnrollmentStatus } from '@prisma/client';
import { prisma } from '../../../config';
import { ApiError } from '../../../utils';
import type { IBatchResponse } from '../batch.interface';
import { formatBatchResponse } from '../batch.utils';

export const getBatchByIdService = async (batchId: string): Promise<IBatchResponse> => {
  const batch = await prisma.batch.findFirst({
    where: {
      id: batchId,
      deletedAt: null,
    },
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
  });

  if (!batch) {
    throw ApiError.notFound('Batch not found');
  }

  const [enrolledCount, pendingCount] = await Promise.all([
    prisma.enrollment.count({
      where: {
        batchId,
        status: EnrollmentStatus.ENROLLED,
      },
    }),
    prisma.enrollment.count({
      where: {
        batchId,
        status: EnrollmentStatus.PENDING,
      },
    }),
  ]);

  return formatBatchResponse(batch, enrolledCount, pendingCount);
};
