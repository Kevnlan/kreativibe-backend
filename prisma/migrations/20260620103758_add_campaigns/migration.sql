-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CampaignSource" AS ENUM ('MANUAL', 'AI');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'SHORTLISTED', 'ACCEPTED', 'REJECTED', 'WITHDRAWN');

-- CreateTable
CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL,
    "brandProfileId" TEXT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "objective" VARCHAR(500),
    "description" VARCHAR(2000),
    "audience" VARCHAR(500),
    "platforms" TEXT[],
    "contentTypes" TEXT[],
    "categories" TEXT[],
    "deliverables" TEXT[],
    "milestones" TEXT[],
    "messaging" VARCHAR(1000),
    "tone" VARCHAR(100),
    "budgetMin" DECIMAL(12,2) NOT NULL,
    "budgetMax" DECIMAL(12,2),
    "currency" VARCHAR(5) NOT NULL DEFAULT 'KES',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "source" "CampaignSource" NOT NULL DEFAULT 'MANUAL',
    "brief" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_applications" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "creatorProfileId" TEXT NOT NULL,
    "message" VARCHAR(2000),
    "proposedRate" DECIMAL(12,2),
    "currency" VARCHAR(5) NOT NULL DEFAULT 'KES',
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaign_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_conversations" (
    "id" TEXT NOT NULL,
    "brandProfileId" TEXT NOT NULL,
    "title" VARCHAR(200),
    "messages" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "campaigns_brandProfileId_idx" ON "campaigns"("brandProfileId");

-- CreateIndex
CREATE INDEX "campaigns_status_idx" ON "campaigns"("status");

-- CreateIndex
CREATE INDEX "campaign_applications_campaignId_idx" ON "campaign_applications"("campaignId");

-- CreateIndex
CREATE INDEX "campaign_applications_creatorProfileId_idx" ON "campaign_applications"("creatorProfileId");

-- CreateIndex
CREATE INDEX "campaign_applications_status_idx" ON "campaign_applications"("status");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_applications_campaignId_creatorProfileId_key" ON "campaign_applications"("campaignId", "creatorProfileId");

-- CreateIndex
CREATE INDEX "ai_conversations_brandProfileId_idx" ON "ai_conversations"("brandProfileId");

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_brandProfileId_fkey" FOREIGN KEY ("brandProfileId") REFERENCES "brand_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_applications" ADD CONSTRAINT "campaign_applications_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_applications" ADD CONSTRAINT "campaign_applications_creatorProfileId_fkey" FOREIGN KEY ("creatorProfileId") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_brandProfileId_fkey" FOREIGN KEY ("brandProfileId") REFERENCES "brand_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
