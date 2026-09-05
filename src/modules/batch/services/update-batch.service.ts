import type { Prisma } from '@prisma/client';
import { prisma } from '../../../config';
import { ApiError, logger } from '../../../utils';
import type { IBatchResponse, IUpdateBatchInput } from '../batch.interface';
import { formatBatchResponse } from '../batch.utils';

export const updateBatchService = async (
  batchId: string,
  input: IUpdateBatchInput,
  adminUserId: string,
): Promise<IBatchResponse> => {
  // 1. Verify batch exists
  const existingBatch = await prisma.batch.findFirst({
    where: {
      id: batchId,
      deletedAt: null,
    },
  });

  if (!existingBatch) {
    throw ApiError.notFound('Batch not found');
  }

  // 2. If name is being changed, verify uniqueness
  if (input.name && input.name.toLowerCase() !== existingBatch.name.toLowerCase()) {
    const duplicate = await prisma.batch.findFirst({
      where: {
        name: {
          equals: input.name,
          mode: 'insensitive',
        },
        id: {
          not: batchId,
        },
        deletedAt: null,
      },
    });

    if (duplicate) {
      throw ApiError.conflict(`A batch named '${input.name}' already exists.`);
    }
  }

  // 3. Build update data
  const updateData: Prisma.BatchUpdateInput = {};
  if (input.name !== undefined) {
    updateData.name = input.name;
  }
  if (input.fee !== undefined) {
    updateData.fee = input.fee as unknown as Prisma.Decimal;
  }
  if (input.status !== undefined) {
    updateData.status = input.status;
  }

  const updatedBatch = await prisma.batch.update({
    where: { id: batchId },
    data: updateData,
  });

  // 4. Log audit trail
  logger.audit('BATCH_UPDATED', {
    batchId,
    changes: input,
    updatedBy: adminUserId,
  });

  return formatBatchResponse(updatedBatch);
};
