/*
  Warnings:

  - You are about to drop the column `discountAmount` on the `enrollments` table. All the data in the column will be lost.
  - You are about to drop the column `openingDue` on the `enrollments` table. All the data in the column will be lost.
  - You are about to drop the column `startBillingMonth` on the `enrollments` table. All the data in the column will be lost.
  - You are about to drop the column `startBillingYear` on the `enrollments` table. All the data in the column will be lost.
  - You are about to drop the `payment_transactions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `receipts` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "payment_transactions" DROP CONSTRAINT "payment_transactions_batchId_fkey";

-- DropForeignKey
ALTER TABLE "payment_transactions" DROP CONSTRAINT "payment_transactions_enrollmentId_fkey";

-- DropForeignKey
ALTER TABLE "payment_transactions" DROP CONSTRAINT "payment_transactions_studentId_fkey";

-- DropForeignKey
ALTER TABLE "receipts" DROP CONSTRAINT "receipts_transactionId_fkey";

-- AlterTable
ALTER TABLE "enrollments" DROP COLUMN "discountAmount",
DROP COLUMN "openingDue",
DROP COLUMN "startBillingMonth",
DROP COLUMN "startBillingYear";

-- DropTable
DROP TABLE "payment_transactions";

-- DropTable
DROP TABLE "receipts";
