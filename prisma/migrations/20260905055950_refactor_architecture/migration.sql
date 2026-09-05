/*
  Warnings:

  - The values [SUPER_ADMIN] on the enum `Role` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `branchAddress` on the `admin_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `branchName` on the `admin_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `branchPhone` on the `admin_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `adminId` on the `batches` table. All the data in the column will be lost.
  - You are about to drop the column `adminId` on the `users` table. All the data in the column will be lost.
  - Added the required column `institutionAddress` to the `admin_profiles` table without a default value. This is not possible if the table is not empty.
  - Added the required column `institutionName` to the `admin_profiles` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "Role_new" AS ENUM ('ADMIN', 'TEACHER', 'STUDENT');
ALTER TABLE "public"."users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "public"."Role_old";
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'STUDENT';
COMMIT;

-- DropForeignKey
ALTER TABLE "batches" DROP CONSTRAINT "batches_adminId_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_adminId_fkey";

-- DropIndex
DROP INDEX "batches_adminId_idx";

-- DropIndex
DROP INDEX "users_adminId_idx";

-- AlterTable
ALTER TABLE "admin_profiles" DROP COLUMN "branchAddress",
DROP COLUMN "branchName",
DROP COLUMN "branchPhone",
ADD COLUMN     "institutionAddress" TEXT NOT NULL,
ADD COLUMN     "institutionEmail" TEXT,
ADD COLUMN     "institutionName" TEXT NOT NULL,
ADD COLUMN     "institutionPhone" TEXT;

-- AlterTable
ALTER TABLE "batches" DROP COLUMN "adminId";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "adminId";
