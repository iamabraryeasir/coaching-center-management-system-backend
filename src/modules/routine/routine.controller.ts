import type { Role } from '@prisma/client';
import type { Request, Response } from 'express';
import { catchAsync, sendResponse, streamPdf } from '../../utils';
import { routineService } from './services';

export const createRoutine = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const actorUserId = req.user?.userId as string;
  const actorRole = req.user?.role as Role;
  const routine = await routineService.createRoutine(req.body, actorUserId, actorRole);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Class routine slot scheduled successfully',
    data: routine,
  });
});

export const getAllRoutines = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const result = await routineService.getAllRoutines(req.query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Routines retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

export const getRoutineById = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const routine = await routineService.getRoutineById(id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Routine slot details retrieved successfully',
    data: routine,
  });
});

export const getBatchTimetable = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const batchId = req.params.batchId as string;
  const timetable = await routineService.getBatchTimetable(batchId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Batch timetable retrieved successfully',
    data: timetable,
  });
});

export const getTeacherSchedule = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const teacherId = req.params.teacherId as string;
  const schedule = await routineService.getTeacherSchedule(teacherId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Teacher schedule retrieved successfully',
    data: schedule,
  });
});

export const getMyTeacherSchedule = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const teacherUserId = req.user?.userId as string;
    const schedule = await routineService.getTeacherSchedule(teacherUserId);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Personal teaching schedule retrieved successfully',
      data: schedule,
    });
  },
);

export const getMyStudentSchedule = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const studentUserId = req.user?.userId as string;
    const schedule = await routineService.getStudentSchedule(studentUserId);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Personal student timetable retrieved successfully',
      data: schedule,
    });
  },
);

export const updateRoutine = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const actorUserId = req.user?.userId as string;
  const actorRole = req.user?.role as Role;
  const updatedRoutine = await routineService.updateRoutine(id, req.body, actorUserId, actorRole);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Class routine slot updated successfully',
    data: updatedRoutine,
  });
});

export const deleteRoutine = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const actorUserId = req.user?.userId as string;
  const actorRole = req.user?.role as Role;
  const result = await routineService.deleteRoutine(id, actorUserId, actorRole);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: result.message,
    data: { routineId: result.routineId },
  });
});

export const getBatchRoutinePdf = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const batchId = req.params.batchId as string;
  const isDownload = req.query.download === 'true';

  const { buffer, filename } = await routineService.getBatchRoutinePdf(batchId);
  streamPdf(res, buffer, filename, isDownload);
});

export const routineController = Object.freeze({
  createRoutine,
  getAllRoutines,
  getRoutineById,
  getBatchTimetable,
  getTeacherSchedule,
  getMyTeacherSchedule,
  getMyStudentSchedule,
  updateRoutine,
  deleteRoutine,
  getBatchRoutinePdf,
});
