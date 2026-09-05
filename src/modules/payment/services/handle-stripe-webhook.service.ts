import { EnrollmentStatus, PaymentStatus } from '@prisma/client';
import type Stripe from 'stripe';
import { config, prisma } from '../../../config';
import {
  ApiError,
  generateReceiptPdfBuffer,
  logger,
  sendPaymentReceiptEmail,
  stripe,
} from '../../../utils';
import { generateReceiptNumber } from '../payment.utils';

export const handleStripeWebhookService = async (
  rawBody?: Buffer,
  signature?: string,
): Promise<{ received: boolean; message?: string }> => {
  if (!rawBody || !signature) {
    throw ApiError.badRequest('Missing raw request payload or Stripe signature header.');
  }

  if (!config.STRIPE_WEBHOOK_SECRET) {
    throw ApiError.internal('Stripe webhook secret is not configured on the server.');
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, config.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    logger.error('Stripe webhook cryptographic signature verification failed:', err);
    throw ApiError.badRequest('Invalid Stripe webhook signature.');
  }

  logger.info(`Received Stripe webhook event: ${event.type} [ID: ${event.id}]`);

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      await processCheckoutSessionCompleted(session);
      break;
    }

    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      await processPaymentIntentFailed(paymentIntent);
      break;
    }

    default:
      logger.debug(`Unhandled Stripe webhook event type: ${event.type}`);
  }

  return { received: true };
};

const processCheckoutSessionCompleted = async (session: Stripe.Checkout.Session): Promise<void> => {
  const sessionId = session.id;
  const transactionId = session.metadata?.transactionId;
  const paymentIntentId =
    typeof session.payment_intent === 'string' ? session.payment_intent : null;

  const transaction = await prisma.paymentTransaction.findFirst({
    where: {
      OR: [{ id: transactionId }, { stripeSessionId: sessionId }],
    },
    include: {
      student: { select: { id: true, name: true, email: true, phone: true } },
      batch: { select: { id: true, name: true, fee: true } },
      receipt: true,
    },
  });

  if (!transaction) {
    logger.warn(`No matching PaymentTransaction found for Stripe session: ${sessionId}`);
    return;
  }

  if (transaction.status === PaymentStatus.COMPLETED) {
    logger.info(`PaymentTransaction ${transaction.id} is already completed. Skipping.`);
    return;
  }

  let assignedReceiptNumber = transaction.receipt?.receiptNumber;

  await prisma.$transaction(async (tx) => {
    const updatedTransaction = await tx.paymentTransaction.update({
      where: { id: transaction.id },
      data: {
        status: PaymentStatus.COMPLETED,
        paidAt: new Date(),
        stripePaymentIntentId: paymentIntentId,
      },
    });

    await tx.enrollment.upsert({
      where: {
        batchId_studentId: {
          batchId: transaction.batchId,
          studentId: transaction.studentId,
        },
      },
      update: {
        status: EnrollmentStatus.ENROLLED,
      },
      create: {
        studentId: transaction.studentId,
        batchId: transaction.batchId,
        status: EnrollmentStatus.ENROLLED,
      },
    });

    if (!transaction.receipt) {
      assignedReceiptNumber = generateReceiptNumber();
      await tx.receipt.create({
        data: {
          transactionId: transaction.id,
          receiptNumber: assignedReceiptNumber,
          issuedAt: new Date(),
        },
      });
    }

    logger.audit('PAYMENT_COMPLETED', {
      transactionId: updatedTransaction.id,
      stripeSessionId: sessionId,
      studentId: transaction.studentId,
      studentEmail: transaction.student.email,
      batchId: transaction.batchId,
      batchName: transaction.batch.name,
      amount: Number(transaction.amount),
      receiptNumber: assignedReceiptNumber,
    });
  });

  logger.info(
    `Successfully processed payment completion for transaction: ${transaction.id} (Student: ${transaction.student.email})`,
  );

  // Generate In-Memory PDF Receipt & Dispatch Automated Email (Zero Cloud Storage)
  try {
    const pdfBuffer = await generateReceiptPdfBuffer({
      receiptNumber: assignedReceiptNumber || 'REC-CONFIRMED',
      issuedAt: new Date(),
      paidAt: new Date(),
      amount: Number(transaction.amount),
      currency: transaction.currency,
      paymentMethod: transaction.paymentMethod,
      status: PaymentStatus.COMPLETED,
      transactionId: transaction.id,
      student: transaction.student,
      batch: {
        id: transaction.batch.id,
        name: transaction.batch.name,
        fee: Number(transaction.batch.fee),
      },
    });

    await sendPaymentReceiptEmail(
      transaction.student.email,
      transaction.student.name,
      assignedReceiptNumber || 'REC-CONFIRMED',
      Number(transaction.amount),
      transaction.currency,
      transaction.batch.name,
      pdfBuffer,
    );
  } catch (emailError) {
    logger.error('Failed to generate/email PDF receipt for online checkout:', emailError);
  }
};

const processPaymentIntentFailed = async (paymentIntent: Stripe.PaymentIntent): Promise<void> => {
  const transaction = await prisma.paymentTransaction.findFirst({
    where: {
      stripePaymentIntentId: paymentIntent.id,
    },
  });

  if (transaction && transaction.status !== PaymentStatus.COMPLETED) {
    await prisma.paymentTransaction.update({
      where: { id: transaction.id },
      data: { status: PaymentStatus.FAILED },
    });

    logger.warn(
      `Payment failed for transaction ${transaction.id} (Stripe PaymentIntent: ${paymentIntent.id})`,
    );
  }
};
