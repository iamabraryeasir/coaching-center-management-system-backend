import type { Role } from '@prisma/client';
import type { Request, Response } from 'express';
import { catchAsync, sendResponse } from '../../utils';
import { paymentService } from './services';

export const createCheckoutSession = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const studentId = req.user?.userId as string;
    const result = await paymentService.createCheckoutSession(studentId, req.body);

    sendResponse(res, {
      statusCode: 201,
      success: true,
      message: 'Stripe Checkout session initialized successfully',
      data: result,
    });
  },
);

export const handleStripeWebhook = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const signature = req.headers['stripe-signature'] as string;
    const result = await paymentService.handleStripeWebhook(req.rawBody, signature);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Stripe webhook event processed successfully',
      data: result,
    });
  },
);

export const collectManualPayment = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const result = await paymentService.collectManualPayment(req.body);

    sendResponse(res, {
      statusCode: 201,
      success: true,
      message: 'Manual payment recorded and receipt issued successfully',
      data: result,
    });
  },
);

export const getMyPayments = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const studentId = req.user?.userId as string;
  const result = await paymentService.getStudentPayments(studentId, req.query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Student payment history retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

export const getAllPayments = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const result = await paymentService.getAllPayments(req.query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'All payment transactions retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

export const getPaymentStats = catchAsync(async (_req: Request, res: Response): Promise<void> => {
  const data = await paymentService.getPaymentStats();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Financial statistics retrieved successfully',
    data,
  });
});

export const getReceiptById = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const receiptId = req.params.receiptId as string;
  const userId = req.user?.userId as string;
  const role = req.user?.role as Role;

  const data = await paymentService.getReceiptById(receiptId, userId, role);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Payment receipt retrieved successfully',
    data,
  });
});

export const getReceiptByTransactionId = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const transactionId = req.params.transactionId as string;
    const userId = req.user?.userId as string;
    const role = req.user?.role as Role;

    const data = await paymentService.getReceiptByTransactionId(transactionId, userId, role);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Payment receipt retrieved successfully',
      data,
    });
  },
);

export const paymentController = Object.freeze({
  createCheckoutSession,
  handleStripeWebhook,
  collectManualPayment,
  getMyPayments,
  getAllPayments,
  getPaymentStats,
  getReceiptById,
  getReceiptByTransactionId,
});
