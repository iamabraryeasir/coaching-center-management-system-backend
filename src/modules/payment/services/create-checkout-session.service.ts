import { config, prisma } from '../../../config';
import { ApiError, ensureStripeConfigured, stripe } from '../../../utils';
import type { ICreateCheckoutSessionPayload } from '../payment.interface';
import { assertValidBillingPeriodNotFuture, ensureMonthlyBillsForPeriod } from '../payment.utils';

export const createCheckoutSession = async (
  studentId: string,
  payload: ICreateCheckoutSessionPayload,
): Promise<{
  sessionId: string;
  url: string | null;
  totalAmount: number;
  currency: string;
  billingPeriodText: string;
}> => {
  ensureStripeConfigured();

  const { targetMonth, targetYear, periodText } = assertValidBillingPeriodNotFuture(
    payload.billingMonth,
    payload.billingYear,
  );

  const student = await prisma.user.findUnique({
    where: { id: studentId, deletedAt: null },
    select: { id: true, name: true, email: true },
  });

  if (!student) {
    throw ApiError.notFound('Student account not found.');
  }

  // Ensure bills exist for the student
  await ensureMonthlyBillsForPeriod(prisma, targetMonth, targetYear, payload.batchId);

  const bills = await prisma.monthlyFeeBill.findMany({
    where: {
      studentId,
      billingMonth: targetMonth,
      billingYear: targetYear,
      dueAmount: { gt: 0 },
      ...(payload.batchId ? { batchId: payload.batchId } : {}),
      batch: { deletedAt: null },
    },
    include: {
      batch: { select: { id: true, name: true } },
    },
  });

  if (bills.length === 0) {
    throw ApiError.badRequest(
      `All tuition fees for ${periodText} are already fully settled. Outstanding due is ৳ 0.00.`,
    );
  }

  const totalAmountToPay = bills.reduce((sum, b) => sum + Number(b.dueAmount), 0);

  const lineItems = bills.map((b) => ({
    price_data: {
      currency: 'bdt',
      unit_amount: Math.round(Number(b.dueAmount) * 100), // convert to subunits / poisha
      product_data: {
        name: `${b.batch.name} — Tuition Fee (${periodText})`,
        description: `Full settlement for ${periodText}. Current Fee: ৳ ${Number(b.monthlyFee).toFixed(2)}, Arrears: ৳ ${Number(b.previousDue).toFixed(2)}`,
      },
    },
    quantity: 1,
  }));

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    customer_email: student.email,
    line_items: lineItems,
    success_url:
      payload.successUrl ||
      `${config.FRONTEND_URL}/student/payments?status=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: payload.cancelUrl || `${config.FRONTEND_URL}/student/payments?status=cancelled`,
    metadata: {
      studentId,
      billingMonth: String(targetMonth),
      billingYear: String(targetYear),
      billIds: bills.map((b) => b.id).join(','),
      studentName: student.name,
      studentEmail: student.email,
    },
  });

  return {
    sessionId: session.id,
    url: session.url,
    totalAmount: totalAmountToPay,
    currency: 'BDT',
    billingPeriodText: periodText,
  };
};
