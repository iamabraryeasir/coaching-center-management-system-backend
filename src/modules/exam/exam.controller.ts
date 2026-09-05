import type { Role } from '@prisma/client';
import type { Request, Response } from 'express';
import { catchAsync, sendResponse, streamPdf } from '../../utils';
import { examService } from './services';

export const createExam = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const actorUserId = req.user?.userId as string;
  const actorRole = req.user?.role as Role;
  const exam = await examService.createExam(req.body, actorUserId, actorRole);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Exam assessment created successfully',
    data: exam,
  });
});

export const getExams = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const result = await examService.getExams(req.query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Exams retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

export const getExamById = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const exam = await examService.getExamById(id);

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
    message: 'Exam details updated successfully',
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
    data: { examId: result.id },
  });
});

export const bulkMarksEntry = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const examId = req.params.id as string;
  const actorUserId = req.user?.userId as string;
  const actorRole = req.user?.role as Role;
  const result = await examService.bulkMarksEntry(examId, req.body, actorUserId, actorRole);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Exam marks submitted and processed successfully',
    data: result,
  });
});

export const updateStudentMark = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const examId = req.params.id as string;
  const studentId = req.params.studentId as string;
  const actorUserId = req.user?.userId as string;
  const actorRole = req.user?.role as Role;
  const result = await examService.updateStudentMark(
    examId,
    studentId,
    req.body,
    actorUserId,
    actorRole,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Student marks updated successfully',
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
      message: 'Exam results unpublished successfully',
      data: exam,
    });
  },
);

export const getExamResults = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const report = await examService.getExamResults(id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Exam results and batch merit report retrieved successfully',
    data: report,
  });
});

export const getMyExamResults = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const studentUserId = req.user?.userId as string;
  const batchId = typeof req.query.batchId === 'string' ? req.query.batchId : undefined;
  const results = await examService.getMyExamResults(studentUserId, batchId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Student personal academic report cards retrieved successfully',
    data: results,
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

export const getStudentReportCardPdf = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const examId = req.params.id as string;
    const studentId = req.params.studentId as string;
    const userId = req.user?.userId as string;
    const role = req.user?.role as Role;
    const isDownload = req.query.download === 'true';

    const { buffer, filename } = await examService.getStudentReportCardPdf(
      examId,
      studentId,
      userId,
      role,
    );
    streamPdf(res, buffer, filename, isDownload);
  },
);

export const sendStudentReportCardEmail = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const examId = req.params.id as string;
    const studentId = req.params.studentId as string;

    const result = await examService.sendStudentReportCardEmail(examId, studentId);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: result.message,
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
  getStudentReportCardPdf,
  sendStudentReportCardEmail,
});
