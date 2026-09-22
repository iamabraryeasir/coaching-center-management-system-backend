import type { Role } from '@prisma/client';
import type { Request, Response } from 'express';
import { catchAsync, sendResponse, streamPdf } from '../../utils';
import type {
  ICollectManualPaymentPayload,
  ICreateCheckoutSessionPayload,
  IMonthlySheetQuery,
  IMonthlyStatsQuery,
} from './payment.interface';
import { paymentServices } from './services';

export const getMonthlySheetController = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const result = await paymentServices.getMonthlySheet(
      req.query as unknown as IMonthlySheetQuery,
    );

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Monthly payment sheet retrieved successfully',
      meta: result.meta,
      data: result.data,
    });
  },
);

export const getMonthlyStatsController = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const data = await paymentServices.getMonthlyStats(req.query as unknown as IMonthlyStatsQuery);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Monthly payment revenue statistics calculated successfully',
      data,
    });
  },
);

export const collectManualPaymentController = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const adminId = req.user?.userId as string;
    const data = await paymentServices.collectManualPayment(
      req.body as ICollectManualPaymentPayload,
      adminId,
    );

    sendResponse(res, {
      statusCode: 201,
      success: true,
      message: 'Payment collected and recorded successfully',
      data,
    });
  },
);

export const getStudentBillController = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const studentId = req.user?.userId as string;
    const month = req.query.month ? Number(req.query.month) : undefined;
    const year = req.query.year ? Number(req.query.year) : undefined;

    const data = await paymentServices.getStudentBill(studentId, month, year);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Student billing summary and dues retrieved successfully',
      data,
    });
  },
);

export const createCheckoutSessionController = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const studentId = req.user?.userId as string;
    const data = await paymentServices.createCheckoutSession(
      studentId,
      req.body as ICreateCheckoutSessionPayload,
    );

    sendResponse(res, {
      statusCode: 201,
      success: true,
      message: 'Stripe checkout session initialized successfully',
      data,
    });
  },
);

export const handleStripeWebhookController = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const signature = req.headers['stripe-signature'];
    const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body));

    const result = await paymentServices.handleStripeWebhook(rawBody, signature);

    res.status(200).json(result);
  },
);

export const getTransactionsController = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const user = req.user as { userId: string; role: Role };
    const result = await paymentServices.getTransactions(req.query, user);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Payment transactions retrieved successfully',
      meta: result.meta,
      data: result.data,
    });
  },
);

export const getReceiptPdfController = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const transactionId = req.params.id as string;
    const user = req.user as { userId: string; role: Role };
    const isDownload = req.query.download === 'true';

    const { buffer, filename } = await paymentServices.getReceiptPdf(transactionId, user);

    streamPdf(res, buffer, filename, isDownload);
  },
);
