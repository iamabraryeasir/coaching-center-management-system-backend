/*
  Warnings:

  - Added the required column `billingMonth` to the `payment_transactions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `billingYear` to the `payment_transactions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "payment_transactions" ADD COLUMN     "billingMonth" INTEGER NOT NULL,
ADD COLUMN     "billingYear" INTEGER NOT NULL,
ADD COLUMN     "notes" TEXT;

-- CreateIndex
CREATE INDEX "payment_transactions_studentId_batchId_billingYear_billingM_idx" ON "payment_transactions"("studentId", "batchId", "billingYear", "billingMonth");
