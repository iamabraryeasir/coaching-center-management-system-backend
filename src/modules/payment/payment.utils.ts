import { EnrollmentStatus, PaymentBillStatus, type PrismaClient } from '@prisma/client';
import { ApiError, getBangladeshCurrentMonth, getBangladeshCurrentYear } from '../../utils';

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

export interface IValidatedBillingPeriod {
  targetMonth: number;
  targetYear: number;
  periodText: string;
}

/**
 * Asserts that the provided billing period is not in the future relative to Bangladesh Standard Time (UTC+6).
 * Defaults to current BST month/year if omitted.
 */
export const assertValidBillingPeriodNotFuture = (
  month?: number,
  year?: number,
): IValidatedBillingPeriod => {
  const currentMonth = getBangladeshCurrentMonth();
  const currentYear = getBangladeshCurrentYear();

  const targetMonth = month || currentMonth;
  const targetYear = year || currentYear;

  const isFuture =
    targetYear > currentYear || (targetYear === currentYear && targetMonth > currentMonth);

  if (isFuture) {
    throw ApiError.badRequest(
      `Future billing periods cannot be viewed or billed. The latest accessible period is ${MONTH_NAMES[currentMonth - 1]} ${currentYear} (BST).`,
    );
  }

  const periodText = `${MONTH_NAMES[targetMonth - 1]} ${targetYear}`;
  return { targetMonth, targetYear, periodText };
};

/**
 * Generates an official unique receipt number: REC-YYYYMM-XXXX
 */
export const generateReceiptNumber = (year: number, month: number): string => {
  const monthPad = String(month).padStart(2, '0');
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  const timestampSuffix = Date.now().toString().slice(-3);
  return `REC-${year}${monthPad}-${randomSuffix}${timestampSuffix}`;
};

/**
 * Idempotently ensures that MonthlyFeeBill records exist for all active enrolled students for a target billing period.
 * Automatically computes carried forward previous dues from historical unpaid months.
 */
export const ensureMonthlyBillsForPeriod = async (
  prisma: PrismaClient,
  targetMonth: number,
  targetYear: number,
  batchId?: string,
): Promise<void> => {
  // Find all active approved enrollments
  const enrollments = await prisma.enrollment.findMany({
    where: {
      status: EnrollmentStatus.ENROLLED,
      ...(batchId ? { batchId } : {}),
      batch: { deletedAt: null },
      student: { deletedAt: null },
    },
    include: {
      batch: { select: { id: true, fee: true } },
    },
  });

  if (enrollments.length === 0) {
    return;
  }

  for (const enrollment of enrollments) {
    const existingBill = await prisma.monthlyFeeBill.findUnique({
      where: {
        enrollmentId_billingYear_billingMonth: {
          enrollmentId: enrollment.id,
          billingYear: targetYear,
          billingMonth: targetMonth,
        },
      },
    });

    if (!existingBill) {
      // Calculate previous due from all earlier bills for this enrollment
      const priorBills = await prisma.monthlyFeeBill.findMany({
        where: {
          enrollmentId: enrollment.id,
          OR: [
            { billingYear: { lt: targetYear } },
            { billingYear: targetYear, billingMonth: { lt: targetMonth } },
          ],
        },
        select: {
          dueAmount: true,
        },
      });

      const previousDue = priorBills.reduce((acc, b) => acc + Number(b.dueAmount), 0);
      const monthlyFee = Number(enrollment.batch.fee);
      const totalPayable = monthlyFee + previousDue;

      await prisma.monthlyFeeBill.create({
        data: {
          studentId: enrollment.studentId,
          batchId: enrollment.batchId,
          enrollmentId: enrollment.id,
          billingMonth: targetMonth,
          billingYear: targetYear,
          monthlyFee,
          previousDue,
          totalPayable,
          paidAmount: 0.0,
          dueAmount: totalPayable,
          status: PaymentBillStatus.UNPAID,
        },
      });
    }
  }
};
