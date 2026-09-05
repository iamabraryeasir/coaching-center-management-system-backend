import type { Request, Response } from 'express';
import { catchAsync, sendResponse } from '../../utils';
import { batchService } from './services';

export const createBatch = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const adminUserId = req.user?.userId as string;
  const batch = await batchService.createBatch(req.body, adminUserId);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Batch created successfully',
    data: batch,
  });
});

export const getAllBatches = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { meta, data } = await batchService.getAllBatches(req.query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Batches retrieved successfully',
    meta,
    data,
  });
});

export const getBatchById = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const batch = await batchService.getBatchById(id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Batch details retrieved successfully',
    data: batch,
  });
});

export const updateBatch = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const adminUserId = req.user?.userId as string;
  const updatedBatch = await batchService.updateBatch(id, req.body, adminUserId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Batch updated successfully',
    data: updatedBatch,
  });
});

export const deleteBatch = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const adminUserId = req.user?.userId as string;
  const result = await batchService.deleteBatch(id, adminUserId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: result.message,
    data: { batchId: result.batchId },
  });
});

export const studentEnroll = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const studentUserId = req.user?.userId as string;
  const enrollment = await batchService.studentEnroll(id, studentUserId);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Enrollment request submitted successfully and is awaiting admin approval',
    data: enrollment,
  });
});

export const adminEnrollStudent = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const { studentId } = req.body;
  const adminUserId = req.user?.userId as string;
  const enrollment = await batchService.adminEnrollStudent(id, studentId, adminUserId);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Student enrolled into batch successfully',
    data: enrollment,
  });
});

export const getPendingEnrollments = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const { meta, data } = await batchService.getPendingEnrollments(req.query);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Pending enrollment requests retrieved successfully',
      meta,
      data,
    });
  },
);

export const approveEnrollment = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const enrollmentId = req.params.enrollmentId as string;
  const adminUserId = req.user?.userId as string;
  const enrollment = await batchService.approveEnrollment(enrollmentId, adminUserId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Enrollment approved successfully',
    data: enrollment,
  });
});

export const rejectEnrollment = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const enrollmentId = req.params.enrollmentId as string;
  const adminUserId = req.user?.userId as string;
  const enrollment = await batchService.rejectEnrollment(enrollmentId, adminUserId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Enrollment rejected successfully',
    data: enrollment,
  });
});

export const getBatchStudents = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const { meta, data } = await batchService.getBatchStudents(id, req.query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Batch students roster retrieved successfully',
    meta,
    data,
  });
});

export const removeStudentFromBatch = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const studentId = req.params.studentId as string;
    const adminUserId = req.user?.userId as string;
    const result = await batchService.removeStudentFromBatch(id, studentId, adminUserId);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: result.message,
      data: { batchId: result.batchId, studentId: result.studentId },
    });
  },
);

export const getMyEnrolledBatches = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const studentUserId = req.user?.userId as string;
    const enrollments = await batchService.getMyEnrolledBatches(studentUserId);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Enrolled batches retrieved successfully',
      data: enrollments,
    });
  },
);

export const batchController = Object.freeze({
  createBatch,
  getAllBatches,
  getBatchById,
  updateBatch,
  deleteBatch,
  studentEnroll,
  adminEnrollStudent,
  getPendingEnrollments,
  approveEnrollment,
  rejectEnrollment,
  getBatchStudents,
  removeStudentFromBatch,
  getMyEnrolledBatches,
});
