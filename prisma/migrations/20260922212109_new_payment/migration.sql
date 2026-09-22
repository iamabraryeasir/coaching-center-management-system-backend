/*
  Warnings:

  - The values [PENDING] on the enum `PaymentStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "PaymentBillStatus" AS ENUM ('UNPAID', 'PARTIAL', 'PAID');

-- AlterEnum
BEGIN;
CREATE TYPE "PaymentStatus_new" AS ENUM ('COMPLETED', 'FAILED', 'REFUNDED');
ALTER TYPE "PaymentStatus" RENAME TO "PaymentStatus_old";
ALTER TYPE "PaymentStatus_new" RENAME TO "PaymentStatus";
DROP TYPE "public"."PaymentStatus_old";
COMMIT;

-- CreateTable
CREATE TABLE "monthly_fee_bills" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "billingMonth" INTEGER NOT NULL,
    "billingYear" INTEGER NOT NULL,
    "monthlyFee" DECIMAL(10,2) NOT NULL,
    "previousDue" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "totalPayable" DECIMAL(10,2) NOT NULL,
    "paidAmount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "dueAmount" DECIMAL(10,2) NOT NULL,
    "status" "PaymentBillStatus" NOT NULL DEFAULT 'UNPAID',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monthly_fee_bills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_transactions" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "monthlyFeeBillId" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'bdt',
    "paymentMethod" "PaymentMethod" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'COMPLETED',
    "stripeSessionId" TEXT,
    "stripePaymentIntentId" TEXT,
    "receiptNumber" TEXT NOT NULL,
    "notes" TEXT,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "collectedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "monthly_fee_bills_studentId_idx" ON "monthly_fee_bills"("studentId");

-- CreateIndex
CREATE INDEX "monthly_fee_bills_batchId_idx" ON "monthly_fee_bills"("batchId");

-- CreateIndex
CREATE INDEX "monthly_fee_bills_billingYear_billingMonth_idx" ON "monthly_fee_bills"("billingYear", "billingMonth");

-- CreateIndex
CREATE INDEX "monthly_fee_bills_status_idx" ON "monthly_fee_bills"("status");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_fee_bills_enrollmentId_billingYear_billingMonth_key" ON "monthly_fee_bills"("enrollmentId", "billingYear", "billingMonth");

-- CreateIndex
CREATE UNIQUE INDEX "payment_transactions_stripeSessionId_key" ON "payment_transactions"("stripeSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_transactions_receiptNumber_key" ON "payment_transactions"("receiptNumber");

-- CreateIndex
CREATE INDEX "payment_transactions_studentId_idx" ON "payment_transactions"("studentId");

-- CreateIndex
CREATE INDEX "payment_transactions_batchId_idx" ON "payment_transactions"("batchId");

-- CreateIndex
CREATE INDEX "payment_transactions_monthlyFeeBillId_idx" ON "payment_transactions"("monthlyFeeBillId");

-- CreateIndex
CREATE INDEX "payment_transactions_receiptNumber_idx" ON "payment_transactions"("receiptNumber");

-- CreateIndex
CREATE INDEX "payment_transactions_status_idx" ON "payment_transactions"("status");

-- AddForeignKey
ALTER TABLE "monthly_fee_bills" ADD CONSTRAINT "monthly_fee_bills_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_fee_bills" ADD CONSTRAINT "monthly_fee_bills_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_fee_bills" ADD CONSTRAINT "monthly_fee_bills_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_monthlyFeeBillId_fkey" FOREIGN KEY ("monthlyFeeBillId") REFERENCES "monthly_fee_bills"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_collectedById_fkey" FOREIGN KEY ("collectedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
