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

/**
 * Stripe Cryptographic Webhook (Unprotected by JWT, verified via Stripe Webhook Signature)
 */
router.post('/webhook', paymentController.handleStripeWebhook);

/**
 * Stripe Online Checkout Session (Student Only)
 */
router.post(
  '/create-checkout-session',
  checkAuth(Role.STUDENT),
  validateRequest(createCheckoutSessionSchema),
  paymentController.createCheckoutSession,
);

/**
 * Manual Fee Payment Collection (Admin Only)
 */
router.post(
  '/manual-collect',
  checkAuth(Role.ADMIN),
  validateRequest(manualPaymentCollectionSchema),
  paymentController.collectManualPayment,
);

/**
 * Authenticated Student Payment History (Student Only)
 */
router.get(
  '/my',
  checkAuth(Role.STUDENT),
  validateRequest(getPaymentsQuerySchema),
  paymentController.getMyPayments,
);

/**
 * Executive Financial Dashboard & Revenue Statistics (Admin Only)
 */
router.get('/stats', checkAuth(Role.ADMIN), paymentController.getPaymentStats);

/**
 * Receipt Lookup by Transaction ID (Admin / Student owner)
 */
router.get(
  '/receipts/by-transaction/:transactionId',
  checkAuth(Role.ADMIN, Role.STUDENT),
  validateRequest(transactionIdParamSchema),
  paymentController.getReceiptByTransactionId,
);

/**
 * Receipt Lookup by Receipt ID (Admin / Student owner)
 */
router.get(
  '/receipts/:receiptId',
  checkAuth(Role.ADMIN, Role.STUDENT),
  validateRequest(receiptIdParamSchema),
  paymentController.getReceiptById,
);

/**
 * All System Payment Transactions Explorer (Admin Only)
 */
router.get(
  '/',
  checkAuth(Role.ADMIN),
  validateRequest(getPaymentsQuerySchema),
  paymentController.getAllPayments,
);

export const paymentRouter: Router = router;
