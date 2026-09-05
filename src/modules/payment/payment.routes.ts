import { Role } from '@prisma/client';
import { Router } from 'express';
import { checkAuth, validateRequest } from '../../middlewares';
import { paymentController } from './payment.controller';
import {
  createCheckoutSessionSchema,
  getPaymentsQuerySchema,
  manualPaymentCollectionSchema,
  receiptIdParamSchema,
  transactionIdParamSchema,
} from './payment.validation';

const router = Router();

router.post('/webhook', paymentController.handleStripeWebhook);

router.post(
  '/create-checkout-session',
  checkAuth(Role.STUDENT),
  validateRequest(createCheckoutSessionSchema),
  paymentController.createCheckoutSession,
);

router.post(
  '/manual-collect',
  checkAuth(Role.ADMIN),
  validateRequest(manualPaymentCollectionSchema),
  paymentController.collectManualPayment,
);

router.get(
  '/my',
  checkAuth(Role.STUDENT),
  validateRequest(getPaymentsQuerySchema),
  paymentController.getMyPayments,
);

router.get('/stats', checkAuth(Role.ADMIN), paymentController.getPaymentStats);

router.get(
  '/receipts/:receiptId/pdf',
  checkAuth(Role.ADMIN, Role.STUDENT),
  validateRequest(receiptIdParamSchema),
  paymentController.getReceiptPdf,
);

router.get(
  '/receipts/by-transaction/:transactionId/pdf',
  checkAuth(Role.ADMIN, Role.STUDENT),
  validateRequest(transactionIdParamSchema),
  paymentController.getReceiptPdfByTransactionId,
);

router.get(
  '/receipts/by-transaction/:transactionId',
  checkAuth(Role.ADMIN, Role.STUDENT),
  validateRequest(transactionIdParamSchema),
  paymentController.getReceiptByTransactionId,
);

router.get(
  '/receipts/:receiptId',
  checkAuth(Role.ADMIN, Role.STUDENT),
  validateRequest(receiptIdParamSchema),
  paymentController.getReceiptById,
);

router.get(
  '/',
  checkAuth(Role.ADMIN),
  validateRequest(getPaymentsQuerySchema),
  paymentController.getAllPayments,
);

export const paymentRouter: Router = router;
