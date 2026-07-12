/*
  Warnings:

  - You are about to drop the column `flatCategory` on the `content` table. All the data in the column will be lost.
  - You are about to drop the column `platform` on the `content` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "content_platform_idx";

-- DropIndex
DROP INDEX "content_status_platform_idx";

-- AlterTable
ALTER TABLE "content" DROP COLUMN "flatCategory",
DROP COLUMN "platform",
ADD COLUMN     "categoryCode" VARCHAR(100),
ADD COLUMN     "platforms" "ContentPlatform"[];
