import type { Role } from '@prisma/client';
import type { Request, Response } from 'express';
import { catchAsync, sendResponse } from '../../utils';
import { examService } from './services';

export const createExam = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const actorUserId = req.user?.userId as string;
  const actorRole = req.user?.role as Role;

  const exam = await examService.createExam(req.body, actorUserId, actorRole);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Exam created successfully',
    data: exam,
  });
});

export const getExams = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const actorUserId = req.user?.userId as string;
  const actorRole = req.user?.role as Role;

  const { meta, data } = await examService.getExams(req.query, actorUserId, actorRole);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Exams retrieved successfully',
    meta,
    data,
  });
});

export const getExamById = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const actorUserId = req.user?.userId as string;
  const actorRole = req.user?.role as Role;

  const exam = await examService.getExamById(id, actorUserId, actorRole);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Exam details retrieved successfully',
    data: exam,
  });
});

export const updateExam = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const actorUserId = req.user?.userId as string;
  const actorRole = req.user?.role as Role;

  const updatedExam = await examService.updateExam(id, req.body, actorUserId, actorRole);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Exam updated successfully',
    data: updatedExam,
  });
});

export const deleteExam = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const actorUserId = req.user?.userId as string;
  const actorRole = req.user?.role as Role;

  const result = await examService.deleteExam(id, actorUserId, actorRole);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: result.message,
    data: { id: result.id },
  });
});

export const bulkMarksEntry = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const actorUserId = req.user?.userId as string;
  const actorRole = req.user?.role as Role;

  const report = await examService.bulkMarksEntry(id, req.body, actorUserId, actorRole);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: `Marks entered successfully for ${report.results.length} students`,
    data: report,
  });
});

export const updateStudentMark = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const studentId = req.params.studentId as string;
  const actorUserId = req.user?.userId as string;
  const actorRole = req.user?.role as Role;

  const result = await examService.updateStudentMark(
    id,
    studentId,
    req.body,
    actorUserId,
    actorRole,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Student exam marks updated successfully',
    data: result,
  });
});

export const publishExamResults = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const actorUserId = req.user?.userId as string;
  const actorRole = req.user?.role as Role;

  const exam = await examService.publishExamResults(id, actorUserId, actorRole);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Exam results published successfully',
    data: exam,
  });
});

export const unpublishExamResults = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const actorUserId = req.user?.userId as string;
    const actorRole = req.user?.role as Role;

    const exam = await examService.unpublishExamResults(id, actorUserId, actorRole);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Exam results reverted to draft successfully',
      data: exam,
    });
  },
);

export const getExamResults = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const actorUserId = req.user?.userId as string;
  const actorRole = req.user?.role as Role;

  const results = await examService.getExamResults(id, actorUserId, actorRole);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Exam results and merit list retrieved successfully',
    data: results,
  });
});

export const getMyExamResults = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const studentId = req.user?.userId as string;
  const batchId = req.query.batchId as string | undefined;

  const reportCard = await examService.getMyExamResults(studentId, batchId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Student report card retrieved successfully',
    data: reportCard,
  });
});

export const getMySingleExamResult = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const examId = req.params.id as string;
    const studentId = req.user?.userId as string;

    const result = await examService.getMySingleExamResult(examId, studentId);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Individual exam result retrieved successfully',
      data: result,
    });
  },
);

export const examController = Object.freeze({
  createExam,
  getExams,
  getExamById,
  updateExam,
  deleteExam,
  bulkMarksEntry,
  updateStudentMark,
  publishExamResults,
  unpublishExamResults,
  getExamResults,
  getMyExamResults,
  getMySingleExamResult,
});
