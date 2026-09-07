import { collectManualPaymentService } from './collect-manual-payment.service';
import { createCheckoutSessionService } from './create-checkout-session.service';
import { getAllDuesService } from './get-all-dues.service';
import { getAllPaymentsService } from './get-all-payments.service';
import { getMyDuesService } from './get-my-dues.service';
import { getPaymentStatsService } from './get-payment-stats.service';
import { getReceiptByTransactionIdService } from './get-receipt.service';
import { getReceiptPdfService } from './get-receipt-pdf.service';
import { getStudentPaymentsService } from './get-student-payments.service';
import { handleStripeWebhookService } from './handle-stripe-webhook.service';
import { setPreviousDuesService } from './set-previous-dues.service';

export const paymentService = Object.freeze({
  createCheckoutSession: createCheckoutSessionService,
  handleStripeWebhook: handleStripeWebhookService,
  collectManualPayment: collectManualPaymentService,
  setPreviousDues: setPreviousDuesService,
  getMyDues: getMyDuesService,
  getAllDues: getAllDuesService,
  getStudentPayments: getStudentPaymentsService,
  getAllPayments: getAllPaymentsService,
  getPaymentStats: getPaymentStatsService,
  getReceiptByTransactionId: getReceiptByTransactionIdService,
  getReceiptPdf: getReceiptPdfService,
});

export {
  collectManualPaymentService,
  createCheckoutSessionService,
  getAllDuesService,
  getAllPaymentsService,
  getMyDuesService,
  getPaymentStatsService,
  getReceiptByTransactionIdService,
  getReceiptPdfService,
  getStudentPaymentsService,
  handleStripeWebhookService,
  setPreviousDuesService,
};
