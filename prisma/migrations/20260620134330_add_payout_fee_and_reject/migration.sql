/*
  Warnings:

  - Added the required column `netAmount` to the `payouts` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "PayoutStatus" ADD VALUE 'REJECTED';

-- AlterTable
ALTER TABLE "countries" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "payouts" ADD COLUMN     "adminComments" VARCHAR(1000),
ADD COLUMN     "bankBranchCode" VARCHAR(50),
ADD COLUMN     "bankSwiftCode" VARCHAR(50),
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "fee" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "netAmount" DECIMAL(12,2) NOT NULL,
ADD COLUMN     "rejectionReason" VARCHAR(500);
