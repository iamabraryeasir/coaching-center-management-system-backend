import { Permission, Role } from '@prisma/client';
import { prisma } from '../../../config';
import { ApiError, logger } from '../../../utils';
import type {
  ITeacherAttendanceRecordResponse,
  IUpdateTeacherAttendanceInput,
} from '../attendance.interface';
import {
  assertAttendanceRecordIsToday,
  formatTeacherAttendanceRecordResponse,
} from '../attendance.utils';

export const updateTeacherAttendanceRecordService = async (
  id: string,
  input: IUpdateTeacherAttendanceInput,
  actorUserId: string,
  actorRole: Role,
): Promise<ITeacherAttendanceRecordResponse> => {
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
        'You lack the MANAGE_ATTENDANCE permission required to correct teacher attendance.',
      );
    }
  }

  // 2. Verify attendance record exists
  const existingRecord = await prisma.teacherAttendanceRecord.findFirst({
    where: {
      id,
      teacher: {
        deletedAt: null,
      },
    },
    include: {
      teacher: {
        include: {
          teacherProfile: true,
        },
      },
    },
  });

  if (!existingRecord) {
    throw ApiError.notFound('Teacher attendance record not found');
  }

  // 3. Enforce view-only rule for past teacher attendance records
  assertAttendanceRecordIsToday(existingRecord.date);

  const previousStatus = existingRecord.status;

  // 4. Update teacher attendance record
  const updatedRecord = await prisma.teacherAttendanceRecord.update({
    where: { id },
    data: {
      status: input.status,
      remarks: input.remarks !== undefined ? input.remarks : existingRecord.remarks,
      markedById: actorUserId,
    },
    include: {
      teacher: {
        include: {
          teacherProfile: true,
        },
      },
      markedBy: true,
    },
  });

  logger.audit('TEACHER_ATTENDANCE_CORRECTED', {
    attendanceId: id,
    teacherId: updatedRecord.teacherId,
    previousStatus,
    newStatus: input.status,
    correctedBy: actorUserId,
  });

  return formatTeacherAttendanceRecordResponse(updatedRecord);
};
