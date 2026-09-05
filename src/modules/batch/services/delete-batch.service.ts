import { BatchStatus } from '@prisma/client';
import { prisma } from '../../../config';
import { ApiError, logger } from '../../../utils';

export const deleteBatchService = async (
  batchId: string,
  adminUserId: string,
): Promise<{ message: string; batchId: string }> => {
  const batch = await prisma.batch.findFirst({
    where: {
      id: batchId,
      deletedAt: null,
    },
  });

  if (!batch) {
    throw ApiError.notFound('Batch not found');
  }

  // Soft delete batch
  await prisma.batch.update({
    where: { id: batchId },
    data: {
      deletedAt: new Date(),
      status: BatchStatus.CANCELLED,
    },
  });

  logger.audit('BATCH_DELETED', {
    batchId,
    batchName: batch.name,
    deletedBy: adminUserId,
  });

  return {
    message: `Batch '${batch.name}' deleted successfully`,
    batchId,
  };
};
