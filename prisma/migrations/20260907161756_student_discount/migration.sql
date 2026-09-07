-- AlterTable
ALTER TABLE "enrollments" ADD COLUMN     "discountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
ADD COLUMN     "openingDue" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
ADD COLUMN     "startBillingMonth" INTEGER,
ADD COLUMN     "startBillingYear" INTEGER;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "gender" "Gender";
