import { PaymentBillStatus, PaymentMethod, PaymentStatus } from '@prisma/client';
import type Stripe from 'stripe';
import { config, prisma } from '../../../config';
import {
  ApiError,
  ensureStripeConfigured,
  generateReceiptPdfBuffer,
  logger,
  sendPaymentReceiptEmail,
  stripe,
} from '../../../utils';
import { generateReceiptNumber, MONTH_NAMES } from '../payment.utils';

export const handleStripeWebhook = async (
  rawPayload: Buffer,
  signature: string | string[] | undefined,
): Promise<{ received: boolean; processed: boolean; eventType: string }> => {
  ensureStripeConfigured();

  if (!signature || typeof signature !== 'string') {
    throw ApiError.badRequest('Missing or invalid Stripe-Signature header');
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawPayload, signature, config.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    logger.error('Stripe webhook cryptographic signature verification failed:', err);
    throw ApiError.badRequest('Webhook signature verification failed');
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    await processCheckoutCompleted(session);
    return { received: true, processed: true, eventType: event.type };
  }

  return { received: true, processed: false, eventType: event.type };
};

const processCheckoutCompleted = async (session: Stripe.Checkout.Session): Promise<void> => {
  const metadata = session.metadata;
  if (!metadata?.studentId || !metadata?.billIds) {
    logger.warn('Stripe checkout session missing required billing metadata. Skipping.');
    return;
  }

  // Idempotency check: verify if transaction was already processed
  const existingTransaction = await prisma.paymentTransaction.findUnique({
    where: { stripeSessionId: session.id },
  });

  if (existingTransaction) {
    logger.info(`Stripe session ${session.id} has already been fulfilled. Skipping.`);
    return;
  }

  const billIdList = metadata.billIds.split(',').filter(Boolean);
  const studentId = metadata.studentId;
  const billingMonth = Number(metadata.billingMonth);
  const billingYear = Number(metadata.billingYear);
  const periodText = `${MONTH_NAMES[billingMonth - 1]} ${billingYear}`;

  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: { id: true, name: true, email: true, phone: true },
  });

  if (!student) {
    logger.error(`Student ID ${studentId} not found during Stripe webhook settlement.`);
    return;
  }

  await prisma.$transaction(async (tx) => {
    for (const billId of billIdList) {
      const bill = await tx.monthlyFeeBill.findUnique({
        where: { id: billId },
        include: { batch: { select: { id: true, name: true, fee: true } } },
      });

      if (!bill || bill.status === PaymentBillStatus.PAID) {
        continue;
      }

      const dueAmountToPay = Number(bill.dueAmount);
      const receiptNumber = generateReceiptNumber(billingYear, billingMonth);

      // Create PaymentTransaction
      const paymentTx = await tx.paymentTransaction.create({
        data: {
          studentId: bill.studentId,
          batchId: bill.batchId,
          monthlyFeeBillId: bill.id,
          amount: dueAmountToPay,
          currency: 'bdt',
          paymentMethod: PaymentMethod.STRIPE,
          status: PaymentStatus.COMPLETED,
          stripeSessionId: session.id,
          stripePaymentIntentId:
            typeof session.payment_intent === 'string' ? session.payment_intent : null,
          receiptNumber,
          notes: `Stripe online checkout for ${periodText}`,
          paidAt: new Date(),
        },
      });

      // Update bill to fully paid
      await tx.monthlyFeeBill.update({
        where: { id: bill.id },
        data: {
          paidAmount: Number(bill.totalPayable),
          dueAmount: 0.0,
          status: PaymentBillStatus.PAID,
        },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          userId: student.id,
          action: 'PAYMENT_COLLECTED',
          entity: 'PaymentTransaction',
          entityId: paymentTx.id,
          details: JSON.stringify({
            gateway: 'STRIPE',
            stripeSessionId: session.id,
            receiptNumber,
            amount: dueAmountToPay,
            batchName: bill.batch.name,
            billingPeriod: periodText,
          }),
        },
      });

      // Asynchronously dispatch receipt email
      (async () => {
        try {
          const pdfBuffer = await generateReceiptPdfBuffer({
            receiptNumber,
            issuedAt: new Date(),
            paidAt: paymentTx.paidAt,
            amount: dueAmountToPay,
            currency: 'bdt',
            paymentMethod: 'STRIPE',
            status: 'COMPLETED',
            transactionId: paymentTx.id,
            billingMonth,
            billingYear,
            notes: 'Online Stripe card payment',
            totalPaidForMonth: Number(bill.totalPayable),
            remainingMonthDue: 0,
            effectiveMonthlyFee: Number(bill.monthlyFee),
            student: {
              id: student.id,
              name: student.name,
              email: student.email,
              phone: student.phone,
            },
            batch: {
              id: bill.batch.id,
              name: bill.batch.name,
              fee: Number(bill.batch.fee),
            },
          });

          await sendPaymentReceiptEmail(
            student.email,
            student.name,
            receiptNumber,
            dueAmountToPay,
            'bdt',
            bill.batch.name,
            pdfBuffer,
            periodText,
          );
        } catch (err) {
          logger.error('Failed to send Stripe receipt email:', err);
        }
      })();
    }
  });

  logger.info(
    `Successfully settled Stripe checkout session: ${session.id} for student ${student.email}`,
  );
};
