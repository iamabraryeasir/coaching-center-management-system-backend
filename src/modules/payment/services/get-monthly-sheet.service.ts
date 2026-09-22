import type { Prisma } from '@prisma/client';
import { prisma } from '../../../config';
import { type IPaginationMeta, QueryBuilder } from '../../../utils';
import type { IMonthlySheetQuery, IMonthlySheetStudentRow } from '../payment.interface';
import {
  assertValidBillingPeriodNotFuture,
  ensureMonthlyBillsForPeriod,
  MONTH_NAMES,
} from '../payment.utils';

export const getMonthlySheet = async (
  query: IMonthlySheetQuery,
): Promise<{
  data: IMonthlySheetStudentRow[];
  meta: IPaginationMeta;
}> => {
  const { targetMonth, targetYear } = assertValidBillingPeriodNotFuture(query.month, query.year);

  // Sync / generate bill records for all enrolled students
  await ensureMonthlyBillsForPeriod(prisma, targetMonth, targetYear, query.batchId);

  // Base scope for the target billing period and non-deleted accounts
  const baseWhere = {
    billingMonth: targetMonth,
    billingYear: targetYear,
    ...(query.batchId ? { batchId: query.batchId } : {}),
    ...(query.status ? { status: query.status } : {}),
    batch: { deletedAt: null },
    student: { deletedAt: null },
  };

  const qb = new QueryBuilder(query as Record<string, unknown>)
    .where(baseWhere)
    .search(['student.name', 'student.email', 'student.phone', 'student.studentProfile.rollNumber'])
    .sort('createdAt', 'desc')
    .paginate(1, 20);

  const prismaQuery = qb.build();

  const [bills, totalCount] = await Promise.all([
    prisma.monthlyFeeBill.findMany({
      where: prismaQuery.where as Prisma.MonthlyFeeBillWhereInput,
      orderBy: prismaQuery.orderBy as Prisma.MonthlyFeeBillOrderByWithRelationInput,
      skip: prismaQuery.skip,
      take: prismaQuery.take,
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatarUrl: true,
            studentProfile: {
              select: {
                rollNumber: true,
                classLevel: true,
              },
            },
          },
        },
        batch: {
          select: {
            id: true,
            name: true,
            fee: true,
          },
        },
        transactions: {
          where: { status: 'COMPLETED' },
          orderBy: { paidAt: 'desc' },
          take: 1,
          select: { paidAt: true },
        },
        _count: {
          select: { transactions: true },
        },
      },
    }),
    prisma.monthlyFeeBill.count({
      where: prismaQuery.where as Prisma.MonthlyFeeBillWhereInput,
    }),
  ]);

  const data: IMonthlySheetStudentRow[] = bills.map((bill) => ({
    id: bill.id,
    enrollmentId: bill.enrollmentId,
    studentId: bill.studentId,
    student: {
      id: bill.student.id,
      name: bill.student.name,
      email: bill.student.email,
      phone: bill.student.phone,
      avatarUrl: bill.student.avatarUrl,
      rollNumber: bill.student.studentProfile?.rollNumber || null,
      classLevel: bill.student.studentProfile?.classLevel || null,
    },
    batchId: bill.batchId,
    batch: {
      id: bill.batch.id,
      name: bill.batch.name,
      fee: Number(bill.batch.fee),
    },
    billingMonth: bill.billingMonth,
    billingYear: bill.billingYear,
    billingPeriodText: `${MONTH_NAMES[bill.billingMonth - 1]} ${bill.billingYear}`,
    monthlyFee: Number(bill.monthlyFee),
    previousDue: Number(bill.previousDue),
    totalPayable: Number(bill.totalPayable),
    paidAmount: Number(bill.paidAmount),
    dueAmount: Number(bill.dueAmount),
    status: bill.status,
    lastPaymentDate: bill.transactions[0]?.paidAt || null,
    paymentCount: bill._count.transactions,
  }));

  return {
    data,
    meta: qb.getPaginationMeta(totalCount),
  };
};
