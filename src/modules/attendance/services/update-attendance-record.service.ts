import { Permission, Role } from '@prisma/client';
import { prisma } from '../../../config';
import { ApiError, logger } from '../../../utils';
import type { IAttendanceRecordResponse, IUpdateAttendanceInput } from '../attendance.interface';
import { formatAttendanceRecordResponse } from '../attendance.utils';

export const updateAttendanceRecordService = async (
  id: string,
  input: IUpdateAttendanceInput,
  actorUserId: string,
  actorRole: Role,
): Promise<IAttendanceRecordResponse> => {
  // 1. Permission check for Teacher
  if (actorRole === Role.TEACHER) {
    const hasPerm = await prisma.teacherPermission.findUnique({
      where: {
        teacherId_permission: {
          teacherId: actorUserId,
          permission: Permission.MANAGE_ATTENDANCE,
        },
      },
    });

    if (!hasPerm) {
      throw ApiError.forbidden(
        'You lack the MANAGE_ATTENDANCE permission required to correct attendance.',
      );
    }
  }

  // 2. Verify attendance record exists
  const existingRecord = await prisma.attendanceRecord.findFirst({
    where: {
      id,
      batch: {
        deletedAt: null,
      },
    },
    include: {
      student: {
        include: {
          studentProfile: true,
        },
      },
      batch: true,
    },
  });

  if (!existingRecord) {
    throw ApiError.notFound('Attendance record not found');
  }

  const previousStatus = existingRecord.status;

  // 3. Update attendance record
  const updatedRecord = await prisma.attendanceRecord.update({
    where: { id },
    data: {
      status: input.status,
      remarks: input.remarks !== undefined ? input.remarks : existingRecord.remarks,
      markedById: actorUserId,
    },
    include: {
      student: {
        include: {
          studentProfile: true,
        },
      },
      batch: true,
      markedBy: true,
    },
  });

  logger.audit('ATTENDANCE_CORRECTED', {
    attendanceId: id,
    batchId: updatedRecord.batchId,
    studentId: updatedRecord.studentId,
    previousStatus,
    newStatus: input.status,
    correctedBy: actorUserId,
  });

  return formatAttendanceRecordResponse(updatedRecord);
};
