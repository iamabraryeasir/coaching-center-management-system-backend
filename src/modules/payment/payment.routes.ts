import { Role } from '@prisma/client';
import { Router } from 'express';
import { checkAuth, validateRequest } from '../../middlewares';
import {
  collectManualPaymentController,
  createCheckoutSessionController,
  getMonthlySheetController,
  getMonthlyStatsController,
  getReceiptPdfController,
  getRevenueTrendController,
  getStudentBillController,
  getTransactionsController,
  handleStripeWebhookController,
} from './payment.controller';
import {
  collectManualPaymentSchema,
  createCheckoutSessionSchema,
  getMonthlySheetQuerySchema,
  getMonthlyStatsQuerySchema,
  getRevenueTrendQuerySchema,
  getTransactionsQuerySchema,
} from './payment.validation';

const paymentRouter: Router = Router();

// Public Webhook Listener
paymentRouter.post('/webhook', handleStripeWebhookController);

// Admin Monthly Management & Collection
paymentRouter.get(
  '/monthly-sheet',
  checkAuth(Role.ADMIN),
  validateRequest(getMonthlySheetQuerySchema),
  getMonthlySheetController,
);

paymentRouter.get(
  '/stats',
  checkAuth(Role.ADMIN),
  validateRequest(getMonthlyStatsQuerySchema),
  getMonthlyStatsController,
);
paymentRouter.get(
  '/monthly-stats',
  checkAuth(Role.ADMIN),
  validateRequest(getMonthlyStatsQuerySchema),
  getMonthlyStatsController,
);

paymentRouter.get(
  '/revenue-trend',
  checkAuth(Role.ADMIN),
  validateRequest(getRevenueTrendQuerySchema),
  getRevenueTrendController,
);

paymentRouter.post(
  '/manual-collect',
  checkAuth(Role.ADMIN),
  validateRequest(collectManualPaymentSchema),
  collectManualPaymentController,
);

// Student Self-Service & Stripe Checkout
paymentRouter.get('/my-bill', checkAuth(Role.STUDENT), getStudentBillController);
paymentRouter.get('/my/bill', checkAuth(Role.STUDENT), getStudentBillController);

paymentRouter.post(
  '/create-checkout-session',
  checkAuth(Role.STUDENT),
  validateRequest(createCheckoutSessionSchema),
  createCheckoutSessionController,
);

// Transactions & Receipts (Admin & Student)
paymentRouter.get(
  '/transactions',
  checkAuth(Role.ADMIN, Role.STUDENT),
  validateRequest(getTransactionsQuerySchema),
  getTransactionsController,
);

paymentRouter.get(
  '/transactions/:id/pdf',
  checkAuth(Role.ADMIN, Role.STUDENT),
  getReceiptPdfController,
);
paymentRouter.get(
  '/receipts/:id/pdf',
  checkAuth(Role.ADMIN, Role.STUDENT),
  getReceiptPdfController,
);

export { paymentRouter };
