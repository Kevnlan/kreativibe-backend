-- CreateEnum
CREATE TYPE "ProposalStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "MilestoneStatus" AS ENUM ('PENDING', 'SUBMITTED', 'APPROVED', 'REJECTED', 'REVISION_REQUESTED');

-- CreateEnum
CREATE TYPE "DeliveryItemType" AS ENUM ('IMAGE', 'VIDEO', 'AUDIO', 'LINK');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'PARTIALLY_SIGNED', 'ACTIVE');

-- CreateEnum
CREATE TYPE "PublishedPostStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'PENDING');

-- CreateEnum
CREATE TYPE "ReputationPointType" AS ENUM ('EARNED', 'BONUS', 'MILESTONE');

-- AlterTable
ALTER TABLE "campaigns" ADD COLUMN     "completedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "backupCodes" TEXT[],
ADD COLUMN     "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "twoFactorEnabledAt" TIMESTAMP(3),
ADD COLUMN     "twoFactorSecret" TEXT;

-- CreateTable
CREATE TABLE "proposals" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "creatorProfileId" TEXT NOT NULL,
    "status" "ProposalStatus" NOT NULL DEFAULT 'DRAFT',
    "proposedRate" DECIMAL(12,2),
    "currency" VARCHAR(5) NOT NULL DEFAULT 'KES',
    "deliverables" TEXT[],
    "timeline" VARCHAR(500),
    "coverLetter" VARCHAR(2000),
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proposals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_milestones" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" VARCHAR(1000),
    "dueDate" TIMESTAMP(3),
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(5) NOT NULL DEFAULT 'KES',
    "status" "MilestoneStatus" NOT NULL DEFAULT 'PENDING',
    "deliverables" TEXT[],
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "reviewNotes" VARCHAR(1000),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaign_milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "milestone_deliveries" (
    "id" TEXT NOT NULL,
    "milestoneId" TEXT NOT NULL,
    "submittedByUserId" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" VARCHAR(2000),
    "reviewNotes" VARCHAR(1000),

    CONSTRAINT "milestone_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "milestone_delivery_items" (
    "id" TEXT NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "type" "DeliveryItemType" NOT NULL,
    "url" TEXT NOT NULL,
    "thumbnail" TEXT,
    "description" VARCHAR(1000),
    "metadata" JSONB,

    CONSTRAINT "milestone_delivery_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contracts" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "brandName" VARCHAR(200) NOT NULL,
    "creativeName" VARCHAR(200) NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(5) NOT NULL DEFAULT 'KES',
    "clauses" JSONB NOT NULL,
    "additionalTerms" VARCHAR(2000),
    "status" "ContractStatus" NOT NULL DEFAULT 'DRAFT',
    "brandSignedAt" TIMESTAMP(3),
    "creatorSignedAt" TIMESTAMP(3),
    "brandSignature" VARCHAR(200),
    "creatorSignature" VARCHAR(200),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portfolio_items" (
    "id" TEXT NOT NULL,
    "creatorProfileId" TEXT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "brand" VARCHAR(200),
    "platform" "ContentPlatform" NOT NULL,
    "mediaUrl" TEXT,
    "completedAt" TIMESTAMP(3),
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "portfolio_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "published_posts" (
    "id" TEXT NOT NULL,
    "creatorProfileId" TEXT NOT NULL,
    "scheduledPostId" TEXT,
    "title" VARCHAR(200) NOT NULL,
    "platform" "ContentPlatform" NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "status" "PublishedPostStatus" NOT NULL DEFAULT 'ACTIVE',
    "views" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "price" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" VARCHAR(5) NOT NULL DEFAULT 'KES',
    "brand" VARCHAR(200),
    "postedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "published_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reputation_points" (
    "id" TEXT NOT NULL,
    "creatorProfileId" TEXT NOT NULL,
    "activity" VARCHAR(200) NOT NULL,
    "points" INTEGER NOT NULL,
    "type" "ReputationPointType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reputation_points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creator_achievements" (
    "id" TEXT NOT NULL,
    "creatorProfileId" TEXT NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "creator_achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courses" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" VARCHAR(1000),
    "duration" VARCHAR(50) NOT NULL,
    "level" VARCHAR(20) NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "certification" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lessons" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_completions" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "creatorProfileId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lesson_completions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_certificates" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "creatorProfileId" TEXT NOT NULL,
    "certificateUrl" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_certificates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "best_practice_examples" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "creator" VARCHAR(200) NOT NULL,
    "platform" "ContentPlatform" NOT NULL,
    "views" INTEGER NOT NULL,
    "engagement" DOUBLE PRECISION NOT NULL,
    "niche" VARCHAR(50) NOT NULL,

    CONSTRAINT "best_practice_examples_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "proposals_campaignId_idx" ON "proposals"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "proposals_campaignId_creatorProfileId_key" ON "proposals"("campaignId", "creatorProfileId");

-- CreateIndex
CREATE INDEX "campaign_milestones_campaignId_idx" ON "campaign_milestones"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "milestone_deliveries_milestoneId_key" ON "milestone_deliveries"("milestoneId");

-- CreateIndex
CREATE INDEX "milestone_delivery_items_deliveryId_idx" ON "milestone_delivery_items"("deliveryId");

-- CreateIndex
CREATE UNIQUE INDEX "contracts_campaignId_key" ON "contracts"("campaignId");

-- CreateIndex
CREATE INDEX "portfolio_items_creatorProfileId_idx" ON "portfolio_items"("creatorProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "published_posts_scheduledPostId_key" ON "published_posts"("scheduledPostId");

-- CreateIndex
CREATE INDEX "published_posts_creatorProfileId_idx" ON "published_posts"("creatorProfileId");

-- CreateIndex
CREATE INDEX "reputation_points_creatorProfileId_createdAt_idx" ON "reputation_points"("creatorProfileId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "creator_achievements_creatorProfileId_key_key" ON "creator_achievements"("creatorProfileId", "key");

-- CreateIndex
CREATE INDEX "lessons_courseId_idx" ON "lessons"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "lesson_completions_lessonId_creatorProfileId_key" ON "lesson_completions"("lessonId", "creatorProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "course_certificates_courseId_creatorProfileId_key" ON "course_certificates"("courseId", "creatorProfileId");

-- CreateIndex
CREATE INDEX "best_practice_examples_niche_idx" ON "best_practice_examples"("niche");

-- AddForeignKey
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_creatorProfileId_fkey" FOREIGN KEY ("creatorProfileId") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_milestones" ADD CONSTRAINT "campaign_milestones_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milestone_deliveries" ADD CONSTRAINT "milestone_deliveries_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "campaign_milestones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milestone_delivery_items" ADD CONSTRAINT "milestone_delivery_items_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "milestone_deliveries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portfolio_items" ADD CONSTRAINT "portfolio_items_creatorProfileId_fkey" FOREIGN KEY ("creatorProfileId") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "published_posts" ADD CONSTRAINT "published_posts_creatorProfileId_fkey" FOREIGN KEY ("creatorProfileId") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "published_posts" ADD CONSTRAINT "published_posts_scheduledPostId_fkey" FOREIGN KEY ("scheduledPostId") REFERENCES "scheduled_posts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reputation_points" ADD CONSTRAINT "reputation_points_creatorProfileId_fkey" FOREIGN KEY ("creatorProfileId") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_achievements" ADD CONSTRAINT "creator_achievements_creatorProfileId_fkey" FOREIGN KEY ("creatorProfileId") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_completions" ADD CONSTRAINT "lesson_completions_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_completions" ADD CONSTRAINT "lesson_completions_creatorProfileId_fkey" FOREIGN KEY ("creatorProfileId") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_certificates" ADD CONSTRAINT "course_certificates_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_certificates" ADD CONSTRAINT "course_certificates_creatorProfileId_fkey" FOREIGN KEY ("creatorProfileId") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
