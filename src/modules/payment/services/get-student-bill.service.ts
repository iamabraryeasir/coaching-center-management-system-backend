import { prisma } from '../../../config';
import { ApiError } from '../../../utils';
import type { IStudentBillResponse } from '../payment.interface';
import { assertValidBillingPeriodNotFuture, ensureMonthlyBillsForPeriod } from '../payment.utils';

export const getStudentBill = async (
  studentId: string,
  month?: number,
  year?: number,
): Promise<IStudentBillResponse> => {
  const { targetMonth, targetYear, periodText } = assertValidBillingPeriodNotFuture(month, year);

  const student = await prisma.user.findUnique({
    where: { id: studentId, deletedAt: null },
    select: { id: true, name: true, email: true },
  });

  if (!student) {
    throw ApiError.notFound('Student account not found.');
  }

  // Ensure bills exist for student's active enrollments
  await ensureMonthlyBillsForPeriod(prisma, targetMonth, targetYear);

  const bills = await prisma.monthlyFeeBill.findMany({
    where: {
      studentId,
      billingMonth: targetMonth,
      billingYear: targetYear,
      batch: { deletedAt: null },
    },
    include: {
      batch: {
        select: {
          id: true,
          name: true,
          fee: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  const totalCurrentMonthFee = bills.reduce((sum, b) => sum + Number(b.monthlyFee), 0);
  const totalPreviousDue = bills.reduce((sum, b) => sum + Number(b.previousDue), 0);
  const netTotalPayable = bills.reduce((sum, b) => sum + Number(b.totalPayable), 0);
  const netTotalPaid = bills.reduce((sum, b) => sum + Number(b.paidAmount), 0);
  const netTotalRemainingDue = bills.reduce((sum, b) => sum + Number(b.dueAmount), 0);

  return {
    student: {
      id: student.id,
      name: student.name,
      email: student.email,
    },
    currentBillingMonth: targetMonth,
    currentBillingYear: targetYear,
    currentBillingPeriodText: periodText,
    totalCurrentMonthFee,
    totalPreviousDue,
    netTotalPayable,
    netTotalPaid,
    netTotalRemainingDue,
    bills: bills.map((b) => ({
      id: b.id,
      enrollmentId: b.enrollmentId,
      batchId: b.batchId,
      batchName: b.batch.name,
      monthlyFee: Number(b.monthlyFee),
      previousDue: Number(b.previousDue),
      totalPayable: Number(b.totalPayable),
      paidAmount: Number(b.paidAmount),
      dueAmount: Number(b.dueAmount),
      status: b.status,
    })),
  };
};
