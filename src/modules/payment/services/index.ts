import { collectManualPaymentService } from './collect-manual-payment.service';
import { createCheckoutSessionService } from './create-checkout-session.service';
import { getAllPaymentsService } from './get-all-payments.service';
import { getPaymentStatsService } from './get-payment-stats.service';
import { getReceiptByIdService, getReceiptByTransactionIdService } from './get-receipt.service';
import { getStudentPaymentsService } from './get-student-payments.service';
import { handleStripeWebhookService } from './handle-stripe-webhook.service';

export const paymentService = Object.freeze({
  createCheckoutSession: createCheckoutSessionService,
  handleStripeWebhook: handleStripeWebhookService,
  collectManualPayment: collectManualPaymentService,
  getStudentPayments: getStudentPaymentsService,
  getAllPayments: getAllPaymentsService,
  getPaymentStats: getPaymentStatsService,
  getReceiptById: getReceiptByIdService,
  getReceiptByTransactionId: getReceiptByTransactionIdService,
});

export {
  collectManualPaymentService,
  createCheckoutSessionService,
  getAllPaymentsService,
  getPaymentStatsService,
  getReceiptByIdService,
  getReceiptByTransactionIdService,
  getStudentPaymentsService,
  handleStripeWebhookService,
};
