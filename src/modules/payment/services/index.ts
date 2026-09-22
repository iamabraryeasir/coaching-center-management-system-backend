import { collectManualPayment } from './collect-manual-payment.service';
import { createCheckoutSession } from './create-checkout-session.service';
import { getMonthlySheet } from './get-monthly-sheet.service';
import { getMonthlyStats } from './get-monthly-stats.service';
import { getReceiptPdf } from './get-receipt-pdf.service';
import { getStudentBill } from './get-student-bill.service';
import { getTransactions } from './get-transactions.service';
import { handleStripeWebhook } from './handle-stripe-webhook.service';

export const paymentServices = Object.freeze({
  getMonthlySheet,
  getMonthlyStats,
  collectManualPayment,
  getStudentBill,
  createCheckoutSession,
  handleStripeWebhook,
  getTransactions,
  getReceiptPdf,
});
