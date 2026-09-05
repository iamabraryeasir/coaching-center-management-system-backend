import { PaymentMethod, PaymentStatus, Role } from '@prisma/client';
import { config, prisma } from '../../../config';
import { ApiError, ensureStripeConfigured, logger, stripe } from '../../../utils';
import type { ICheckoutSessionResponse, ICreateCheckoutSessionInput } from '../payment.interface';

export const createCheckoutSessionService = async (
  studentId: string,
  input: ICreateCheckoutSessionInput,
): Promise<ICheckoutSessionResponse> => {
  ensureStripeConfigured();

  const { batchId, currency = 'bdt' } = input;

  // 1. Verify student exists and is active
  const student = await prisma.user.findFirst({
    where: {
      id: studentId,
      role: Role.STUDENT,
      deletedAt: null,
    },
  });

  if (!student) {
    throw ApiError.notFound('Student not found or inactive');
  }

  // 2. Verify batch exists and is active
  const batch = await prisma.batch.findFirst({
    where: {
      id: batchId,
      deletedAt: null,
    },
  });

  if (!batch) {
    throw ApiError.notFound('Batch not found');
  }

  // 3. Check for existing student enrollment
  const enrollment = await prisma.enrollment.findUnique({
    where: {
      batchId_studentId: {
        batchId,
        studentId,
      },
    },
  });

  // 4. Check if payment was already completed for this batch
  const existingCompletedPayment = await prisma.paymentTransaction.findFirst({
    where: {
      studentId,
      batchId,
      status: PaymentStatus.COMPLETED,
    },
  });

  if (existingCompletedPayment) {
    throw ApiError.conflict('Payment for this batch has already been completed.');
  }

  // 5. Initialize pending transaction in database first to obtain a stable transactionId
  const transaction = await prisma.paymentTransaction.create({
    data: {
      studentId,
      batchId,
      enrollmentId: enrollment?.id,
      amount: batch.fee,
      currency: currency.toLowerCase(),
      paymentMethod: PaymentMethod.STRIPE,
      status: PaymentStatus.PENDING,
    },
  });

  try {
    // 6. Create Stripe Checkout Session
    const unitAmount = Math.round(Number(batch.fee) * 100);
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: student.email,
      client_reference_id: student.id,
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: `${batch.name} Tuition Fee`,
              description: `Batch enrollment & academic fee for ${batch.name}`,
            },
            unit_amount: unitAmount,
          },
          quantity: 1,
        },
      ],
      metadata: {
        transactionId: transaction.id,
        studentId: student.id,
        batchId: batch.id,
        enrollmentId: enrollment?.id || '',
      },
      success_url:
        config.FRONTEND_URL +
        '/payments/success?session_id={CHECKOUT_SESSION_ID}&transaction_id=' +
        transaction.id,
      cancel_url: `${config.FRONTEND_URL}/payments/cancel?transaction_id=${transaction.id}`,
    });

    // 7. Update transaction with Stripe Session ID
    await prisma.paymentTransaction.update({
      where: { id: transaction.id },
      data: {
        stripeSessionId: session.id,
      },
    });

    logger.info(`Created Stripe checkout session: ${session.id} for student ${student.email}`);

    return {
      sessionId: session.id,
      sessionUrl: session.url,
      transactionId: transaction.id,
    };
  } catch (error) {
    // If Stripe session creation fails, mark transaction as FAILED
    await prisma.paymentTransaction.update({
      where: { id: transaction.id },
      data: { status: PaymentStatus.FAILED },
    });

    logger.error('Failed to create Stripe Checkout session:', error);
    throw ApiError.internal('Failed to initialize payment gateway checkout session.');
  }
};
