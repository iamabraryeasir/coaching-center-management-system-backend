import { prisma } from '../../../config';
import { ApiError, generateRoutinePdfBuffer } from '../../../utils';

export const getBatchRoutinePdfService = async (
  batchId: string,
): Promise<{ buffer: Buffer; filename: string }> => {
  const batch = await prisma.batch.findFirst({
    where: { id: batchId, deletedAt: null },
  });

  if (!batch) {
    throw ApiError.notFound('Batch not found');
  }

  const routines = await prisma.classRoutine.findMany({
    where: { batchId },
    include: {
      teacher: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
  });

  const pdfBuffer = await generateRoutinePdfBuffer({
    batch: {
      id: batch.id,
      name: batch.name,
      fee: Number(batch.fee),
    },
    schedules: routines.map((r) => ({
      id: r.id,
      dayOfWeek: r.dayOfWeek,
      subject: r.subject || 'General Class',
      startTime: r.startTime,
      endTime: r.endTime,
      roomNumber: r.room || 'N/A',
      teacher: {
        name: r.teacher?.name || 'TBA',
        email: r.teacher?.email || 'N/A',
      },
    })),
  });

  const sanitizedBatchName = batch.name.replace(/[^a-zA-Z0-9]/g, '_');
  return {
    buffer: pdfBuffer,
    filename: `Routine-${sanitizedBatchName}.pdf`,
  };
};
