-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('USER_BANNED', 'USER_SUSPENDED', 'USER_REINSTATED', 'USER_VERIFIED', 'USER_VERIFICATION_REVOKED', 'CONTENT_REMOVED', 'CONTENT_FEATURED', 'CONTENT_UNFEATURED', 'LICENSE_REVOKED', 'COMMISSION_RATE_CHANGED', 'WITHDRAWAL_APPROVED', 'WITHDRAWAL_REJECTED', 'SYSTEM_CONFIG_UPDATED', 'MODERATION_RULE_CREATED', 'MODERATION_RULE_UPDATED', 'MODERATION_RULE_DELETED');

-- CreateEnum
CREATE TYPE "ReviewEntityType" AS ENUM ('CREATOR', 'BRAND', 'CONTENT');

-- CreateEnum
CREATE TYPE "EmailFrequency" AS ENUM ('INSTANT', 'DAILY', 'WEEKLY', 'NEVER');

-- AlterTable
ALTER TABLE "brand_profiles" ADD COLUMN     "averageRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "totalReviews" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "entityType" VARCHAR(50) NOT NULL,
    "entityId" VARCHAR(100) NOT NULL,
    "metadata" JSONB,
    "ipAddress" VARCHAR(45),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "subjectId" VARCHAR(100) NOT NULL,
    "subjectType" "ReviewEntityType" NOT NULL,
    "campaignId" TEXT,
    "offerId" TEXT,
    "rating" INTEGER NOT NULL,
    "title" VARCHAR(200),
    "body" VARCHAR(2000),
    "response" VARCHAR(2000),
    "respondedAt" TIMESTAMP(3),
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_settings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emailFrequency" "EmailFrequency" NOT NULL DEFAULT 'INSTANT',
    "pushEnabled" BOOLEAN NOT NULL DEFAULT true,
    "smsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "notificationTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "profileVisible" BOOLEAN NOT NULL DEFAULT true,
    "showEarnings" BOOLEAN NOT NULL DEFAULT false,
    "allowDirectMessages" BOOLEAN NOT NULL DEFAULT true,
    "showInSearch" BOOLEAN NOT NULL DEFAULT true,
    "preferredLanguage" VARCHAR(10) NOT NULL DEFAULT 'en',
    "preferredCurrency" VARCHAR(5) NOT NULL DEFAULT 'KES',
    "timezone" VARCHAR(50) NOT NULL DEFAULT 'Africa/Nairobi',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_logs_actorId_createdAt_idx" ON "audit_logs"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_action_createdAt_idx" ON "audit_logs"("action", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "reviews_subjectId_subjectType_idx" ON "reviews"("subjectId", "subjectType");

-- CreateIndex
CREATE INDEX "reviews_reviewerId_idx" ON "reviews"("reviewerId");

-- CreateIndex
CREATE UNIQUE INDEX "user_settings_userId_key" ON "user_settings"("userId");

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "offers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
