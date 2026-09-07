import { Role } from '@prisma/client';
import { Router } from 'express';
import { checkAuth, validateRequest } from '../../middlewares';
import { paymentController } from './payment.controller';
import {
  createCheckoutSessionSchema,
  getDuesQuerySchema,
  getPaymentsQuerySchema,
  manualPaymentCollectionSchema,
  setPreviousDuesSchema,
  transactionIdParamSchema,
} from './payment.validation';

const router = Router();

// Stripe Webhook Endpoint (Raw body signature verified inside service)
router.post('/webhook', paymentController.handleStripeWebhook);

// Student: Initialize Stripe Checkout session for a specific monthly fee
router.post(
  '/create-checkout-session',
  checkAuth(Role.STUDENT),
  validateRequest(createCheckoutSessionSchema),
  paymentController.createCheckoutSession,
);

// Admin: Collect offline / cash / mobile banking payment for a student's monthly fee
router.post(
  '/manual-collect',
  checkAuth(Role.ADMIN),
  validateRequest(manualPaymentCollectionSchema),
  paymentController.collectManualPayment,
);

// Admin: Configure historical billing start period & opening dues on enrollment
router.patch(
  '/enrollments/:enrollmentId/previous-dues',
  checkAuth(Role.ADMIN),
  validateRequest(setPreviousDuesSchema),
  paymentController.setPreviousDues,
);

// Student: Check outstanding monthly dues and unpaid billing months
router.get('/my/dues', checkAuth(Role.STUDENT), paymentController.getMyDues);

// Student: View student's own payment transaction history
router.get(
  '/my',
  checkAuth(Role.STUDENT),
  validateRequest(getPaymentsQuerySchema),
  paymentController.getMyPayments,
);

// Admin: Check all students with outstanding dues & defaulters list
router.get(
  '/dues',
  checkAuth(Role.ADMIN),
  validateRequest(getDuesQuerySchema),
  paymentController.getAllDues,
);

// Admin: Aggregate financial statistics & breakdown
router.get('/stats', checkAuth(Role.ADMIN), paymentController.getPaymentStats);

// Streamlined Receipt Endpoints (Standardized on transactionId)
router.get(
  '/transactions/:transactionId/receipt',
  checkAuth(Role.ADMIN, Role.STUDENT),
  validateRequest(transactionIdParamSchema),
  paymentController.getReceiptByTransactionId,
);

router.get(
  '/transactions/:transactionId/pdf',
  checkAuth(Role.ADMIN, Role.STUDENT),
  validateRequest(transactionIdParamSchema),
  paymentController.getReceiptPdfByTransactionId,
);

// Admin: Search, filter, and paginate all payment transactions
router.get(
  '/',
  checkAuth(Role.ADMIN),
  validateRequest(getPaymentsQuerySchema),
  paymentController.getAllPayments,
);

export const paymentRouter: Router = router;
