import type { Role } from '@prisma/client';
import type { Request, Response } from 'express';
import { catchAsync, sendResponse } from '../../utils';
import { attendanceService } from './services';

export const markBulkAttendance = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const batchId = req.params.batchId as string;
  const actorUserId = req.user?.userId as string;
  const actorRole = req.user?.role as Role;

  const records = await attendanceService.markBulkAttendance(
    batchId,
    req.body,
    actorUserId,
    actorRole,
  );

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: `Successfully marked attendance for ${records.length} students`,
    data: records,
  });
});

export const updateAttendanceRecord = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const actorUserId = req.user?.userId as string;
    const actorRole = req.user?.role as Role;

    const updatedRecord = await attendanceService.updateAttendanceRecord(
      id,
      req.body,
      actorUserId,
      actorRole,
    );

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Attendance record updated successfully',
      data: updatedRecord,
    });
  },
);

export const getBatchAttendance = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const batchId = req.params.batchId as string;
  const { meta, data } = await attendanceService.getBatchAttendance(batchId, req.query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Batch attendance records and statistics retrieved successfully',
    meta,
    data,
  });
});

export const getStudentAttendance = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const studentId = req.params.studentId as string;
    const { meta, data } = await attendanceService.getStudentAttendance(studentId, req.query);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Student attendance history retrieved successfully',
      meta,
      data,
    });
  },
);

export const getMyAttendance = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const studentUserId = req.user?.userId as string;
  const { meta, data } = await attendanceService.getMyAttendance(studentUserId, req.query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Personal attendance summary retrieved successfully',
    meta,
    data,
  });
});

export const markBulkTeacherAttendance = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const actorUserId = req.user?.userId as string;

    const result = await attendanceService.markBulkTeacherAttendance(req.body, actorUserId);

    sendResponse(res, {
      statusCode: 201,
      success: true,
      message: `Successfully marked attendance for ${result.markedCount} teachers on ${result.date}`,
      data: result,
    });
  },
);

export const selfCheckInTeacher = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const teacherId = req.user?.userId as string;

  const record = await attendanceService.selfCheckInTeacher(teacherId, req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Self check-in recorded successfully for today',
    data: record,
  });
});

export const getTeacherAttendance = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const { meta, data } = await attendanceService.getTeacherAttendance(req.query);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Teacher attendance records and statistics retrieved successfully',
      meta,
      data,
    });
  },
);

export const updateTeacherAttendanceRecord = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const actorUserId = req.user?.userId as string;
    const actorRole = req.user?.role as Role;

    const updatedRecord = await attendanceService.updateTeacherAttendanceRecord(
      id,
      req.body,
      actorUserId,
      actorRole,
    );

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Teacher attendance record updated successfully',
      data: updatedRecord,
    });
  },
);

export const getTeacherAttendanceSummary = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const teacherId = req.params.teacherId as string;
    const { meta, data } = await attendanceService.getTeacherAttendanceSummary(
      teacherId,
      req.query,
    );

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Teacher attendance summary retrieved successfully',
      meta,
      data,
    });
  },
);

export const getMyTeacherAttendance = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const teacherId = req.user?.userId as string;
    const { meta, data } = await attendanceService.getMyTeacherAttendance(teacherId, req.query);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Personal teacher attendance summary retrieved successfully',
      meta,
      data,
    });
  },
);

export const attendanceController = Object.freeze({
  markBulkAttendance,
  updateAttendanceRecord,
  getBatchAttendance,
  getStudentAttendance,
  getMyAttendance,
  markBulkTeacherAttendance,
  selfCheckInTeacher,
  getTeacherAttendance,
  updateTeacherAttendanceRecord,
  getTeacherAttendanceSummary,
  getMyTeacherAttendance,
});
