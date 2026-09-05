import { BatchStatus, type Prisma } from '@prisma/client';
import { prisma } from '../../../config';
import { ApiError, logger } from '../../../utils';
import type { IBatchResponse, ICreateBatchInput } from '../batch.interface';
import { formatBatchResponse } from '../batch.utils';

export const createBatchService = async (
  input: ICreateBatchInput,
  adminUserId: string,
): Promise<IBatchResponse> => {
  // 1. Verify batch name uniqueness among active batches
  const existingBatch = await prisma.batch.findFirst({
    where: {
      name: {
        equals: input.name,
        mode: 'insensitive',
      },
      deletedAt: null,
    },
  });

  if (existingBatch) {
    throw ApiError.conflict(`A batch named '${input.name}' already exists.`);
  }

  // 2. Create batch
  const newBatch = await prisma.batch.create({
    data: {
      name: input.name,
      fee: input.fee as unknown as Prisma.Decimal,
      status: input.status || BatchStatus.ONGOING,
    },
  });

  // 3. Log audit event
  logger.audit('BATCH_CREATED', {
    batchId: newBatch.id,
    name: newBatch.name,
    fee: Number(newBatch.fee),
    status: newBatch.status,
    createdBy: adminUserId,
  });

  return formatBatchResponse(newBatch, 0, 0);
};
