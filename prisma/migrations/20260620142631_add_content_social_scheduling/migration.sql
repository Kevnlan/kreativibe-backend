-- CreateEnum
CREATE TYPE "ScheduledPostStatus" AS ENUM ('SCHEDULED', 'PUBLISHED', 'FAILED');

-- AlterTable
ALTER TABLE "content" ADD COLUMN     "brand" VARCHAR(200),
ADD COLUMN     "coverImage" TEXT,
ADD COLUMN     "flatCategory" VARCHAR(100),
ADD COLUMN     "format" VARCHAR(50),
ADD COLUMN     "mediaUrls" TEXT[];

-- CreateTable
CREATE TABLE "social_accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" "ContentPlatform" NOT NULL,
    "platformUserId" TEXT NOT NULL,
    "username" VARCHAR(100),
    "displayName" VARCHAR(200),
    "profileImage" TEXT,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "permissions" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheduled_posts" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "creatorProfileId" TEXT NOT NULL,
    "socialAccountId" TEXT,
    "title" VARCHAR(200) NOT NULL,
    "platform" "ContentPlatform" NOT NULL,
    "scheduledDate" VARCHAR(10) NOT NULL,
    "scheduledTime" VARCHAR(5) NOT NULL,
    "content" VARCHAR(2000),
    "media" TEXT[],
    "status" "ScheduledPostStatus" NOT NULL DEFAULT 'SCHEDULED',
    "publishedAt" TIMESTAMP(3),
    "platformPostUrl" TEXT,
    "failureReason" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scheduled_posts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "social_accounts_userId_idx" ON "social_accounts"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "social_accounts_userId_platform_platformUserId_key" ON "social_accounts"("userId", "platform", "platformUserId");

-- CreateIndex
CREATE INDEX "scheduled_posts_campaignId_idx" ON "scheduled_posts"("campaignId");

-- CreateIndex
CREATE INDEX "scheduled_posts_creatorProfileId_idx" ON "scheduled_posts"("creatorProfileId");

-- AddForeignKey
ALTER TABLE "social_accounts" ADD CONSTRAINT "social_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_posts" ADD CONSTRAINT "scheduled_posts_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_posts" ADD CONSTRAINT "scheduled_posts_creatorProfileId_fkey" FOREIGN KEY ("creatorProfileId") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_posts" ADD CONSTRAINT "scheduled_posts_socialAccountId_fkey" FOREIGN KEY ("socialAccountId") REFERENCES "social_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
