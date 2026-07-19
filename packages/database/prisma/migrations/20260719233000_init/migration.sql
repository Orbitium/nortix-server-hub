-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('PLAYER', 'SERVER_OWNER', 'MODERATOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'LIMITED', 'UNDER_REVIEW', 'SUSPENDED', 'BANNED');

-- CreateEnum
CREATE TYPE "ServerEdition" AS ENUM ('JAVA', 'BEDROCK');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ModerationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'HIDDEN', 'FLAGGED');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'SCHEDULED', 'ACTIVE', 'PAUSED', 'COMPLETED', 'REJECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ParticipationStatus" AS ENUM ('JOINED', 'ACTIVE', 'COMPLETED', 'ABANDONED', 'REJECTED', 'UNDER_REVIEW', 'DISQUALIFIED');

-- CreateEnum
CREATE TYPE "CompletionStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED', 'UNDER_REVIEW');

-- CreateEnum
CREATE TYPE "LedgerDirection" AS ENUM ('CREDIT', 'DEBIT');

-- CreateEnum
CREATE TYPE "EarningsTransactionType" AS ENUM ('MILESTONE_REWARD', 'MANUAL_ADJUSTMENT', 'WITHDRAWAL_RESERVATION', 'WITHDRAWAL_COMPLETION', 'WITHDRAWAL_CANCELLATION', 'REFUND_REVERSAL', 'FRAUD_REVERSAL', 'PROMOTIONAL_SUBSIDY', 'MIGRATION_ADJUSTMENT');

-- CreateEnum
CREATE TYPE "SparksTransactionType" AS ENUM ('CAMPAIGN_REWARD', 'DAILY_QUEST', 'STREAK', 'ACHIEVEMENT', 'SEASONAL_EVENT', 'REFERRAL', 'COMMUNITY_ACTIVITY', 'COSMETIC_PURCHASE', 'MANUAL_ADJUSTMENT');

-- CreateEnum
CREATE TYPE "CampaignCreditTransactionType" AS ENUM ('PURCHASED', 'PROMOTIONAL', 'SPENT', 'PROMOTIONAL_EXPIRED', 'REFUND', 'INTERNAL_ADJUSTMENT');

-- CreateEnum
CREATE TYPE "WithdrawalStatus" AS ENUM ('REQUESTED', 'UNDER_REVIEW', 'APPROVED', 'PROCESSING', 'PAID', 'REJECTED', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "AnalyticsSource" AS ENUM ('WEB', 'MANUAL', 'SERVER_PLUGIN', 'CLIENT_MOD', 'API');

-- CreateEnum
CREATE TYPE "RiskState" AS ENUM ('CLEAR', 'FLAGGED', 'UNDER_REVIEW', 'ESCALATED', 'RESOLVED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "firebaseUid" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "roles" "UserRole"[] DEFAULT ARRAY['PLAYER']::"UserRole"[],
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "countryCode" TEXT,
    "preferredCurrency" TEXT NOT NULL DEFAULT 'USD',
    "publicProfile" JSONB NOT NULL DEFAULT '{}',
    "moderationState" JSONB NOT NULL DEFAULT '{}',
    "reputationScore" INTEGER NOT NULL DEFAULT 0,
    "reputationTier" TEXT NOT NULL DEFAULT 'New Tester',
    "testerLevel" INTEGER NOT NULL DEFAULT 1,
    "sparksBalanceCache" INTEGER NOT NULL DEFAULT 0,
    "earningsBalanceCache" INTEGER NOT NULL DEFAULT 0,
    "pendingEarningsCache" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MinecraftIdentity" (
    "id" TEXT NOT NULL,
    "uuid" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "lastKnownUsername" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verificationMethod" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MinecraftIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Server" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "hostname" TEXT NOT NULL,
    "port" INTEGER NOT NULL DEFAULT 25565,
    "versions" TEXT[],
    "edition" "ServerEdition" NOT NULL,
    "categories" TEXT[],
    "tags" TEXT[],
    "logoUrl" TEXT,
    "bannerUrl" TEXT,
    "screenshotUrls" TEXT[],
    "discordUrl" TEXT,
    "websiteUrl" TEXT,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "moderationStatus" "ModerationStatus" NOT NULL DEFAULT 'PENDING',
    "claimed" BOOLEAN NOT NULL DEFAULT false,
    "online" BOOLEAN NOT NULL DEFAULT false,
    "publicListing" BOOLEAN NOT NULL DEFAULT false,
    "playerCount" INTEGER,
    "maxPlayers" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Server_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServerVerification" (
    "id" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "challenge" JSONB NOT NULL,
    "evidence" JSONB,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reviewNote" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServerVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "category" TEXT NOT NULL,
    "internalBudgetCents" INTEGER NOT NULL,
    "publicRewardCents" INTEGER NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "maxParticipants" INTEGER NOT NULL,
    "completionLimit" INTEGER NOT NULL,
    "eligibilityRules" JSONB NOT NULL DEFAULT '{}',
    "versionRequirements" TEXT[],
    "regionRestrictions" TEXT[],
    "moderationNotes" TEXT,
    "rejectionReason" TEXT,
    "internalRiskScore" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MilestoneTemplate" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "verificationMethods" TEXT[],
    "requiredConfiguration" JSONB NOT NULL,
    "expectedDurationMinutes" INTEGER NOT NULL,
    "minimumRewardCents" INTEGER NOT NULL,
    "maximumRewardCents" INTEGER NOT NULL,
    "abuseRisk" INTEGER NOT NULL,
    "manualReviewRequired" BOOLEAN NOT NULL DEFAULT false,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MilestoneTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignMilestone" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "templateType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "publicInstructions" TEXT NOT NULL,
    "verificationConfig" JSONB NOT NULL,
    "order" INTEGER NOT NULL,
    "publicRewardCents" INTEGER NOT NULL,
    "sparksReward" INTEGER NOT NULL,
    "completionRequirements" JSONB NOT NULL,
    "verificationMethod" TEXT NOT NULL,
    "reviewRequired" BOOLEAN NOT NULL DEFAULT false,
    "maximumCompletionCount" INTEGER,

    CONSTRAINT "CampaignMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignParticipation" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "minecraftIdentityId" TEXT,
    "status" "ParticipationStatus" NOT NULL DEFAULT 'JOINED',
    "currentMilestone" INTEGER NOT NULL DEFAULT 0,
    "eligibilitySnapshot" JSONB NOT NULL,
    "disqualificationReason" TEXT,
    "fraudReviewState" "RiskState" NOT NULL DEFAULT 'CLEAR',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "CampaignParticipation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MilestoneCompletion" (
    "id" TEXT NOT NULL,
    "participationId" TEXT NOT NULL,
    "milestoneId" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "evidence" JSONB NOT NULL,
    "verificationSource" TEXT NOT NULL,
    "status" "CompletionStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "rewardTransactionId" TEXT,
    "sparksTransactionId" TEXT,

    CONSTRAINT "MilestoneCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedbackResponse" (
    "id" TEXT NOT NULL,
    "participationId" TEXT NOT NULL,
    "overallRating" INTEGER NOT NULL,
    "onboardingClarity" INTEGER NOT NULL,
    "gameplayClarity" INTEGER NOT NULL,
    "performance" INTEGER NOT NULL,
    "difficulty" INTEGER NOT NULL,
    "likelihoodToReturn" INTEGER NOT NULL,
    "comments" TEXT NOT NULL,
    "bugReports" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedbackResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "campaignLinked" BOOLEAN NOT NULL DEFAULT false,
    "moderationStatus" "ModerationStatus" NOT NULL DEFAULT 'PENDING',
    "helpfulCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WithdrawalRequest" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "requestedAmountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "payoutProvider" TEXT NOT NULL,
    "payoutDestinationReference" TEXT NOT NULL,
    "status" "WithdrawalStatus" NOT NULL DEFAULT 'REQUESTED',
    "feesCents" INTEGER NOT NULL DEFAULT 0,
    "finalPaidAmountCents" INTEGER,
    "reviewState" "RiskState" NOT NULL DEFAULT 'CLEAR',
    "fraudState" "RiskState" NOT NULL DEFAULT 'CLEAR',
    "providerTransactionReference" TEXT,
    "reviewedById" TEXT,
    "internalNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "WithdrawalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EarningsLedgerEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "direction" "LedgerDirection" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "transactionType" "EarningsTransactionType" NOT NULL,
    "referenceType" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "createdById" TEXT,
    "internalNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EarningsLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SparksLedgerEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "direction" "LedgerDirection" NOT NULL,
    "amount" INTEGER NOT NULL,
    "transactionType" "SparksTransactionType" NOT NULL,
    "referenceType" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "createdById" TEXT,
    "internalNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SparksLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignCreditLedgerEntry" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "direction" "LedgerDirection" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "purchasedCents" INTEGER NOT NULL DEFAULT 0,
    "promotionalCents" INTEGER NOT NULL DEFAULT 0,
    "transactionType" "CampaignCreditTransactionType" NOT NULL,
    "referenceType" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdById" TEXT,
    "internalNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignCreditLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CosmeticItem" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "sparksPrice" INTEGER NOT NULL,
    "rarity" TEXT NOT NULL,
    "season" TEXT,
    "preview" JSONB NOT NULL,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CosmeticItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CosmeticPurchase" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "sparksLedgerEntryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CosmeticPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "serverId" TEXT,
    "campaignId" TEXT,
    "participationId" TEXT,
    "source" "AnalyticsSource" NOT NULL,
    "type" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationApiKey" (
    "id" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "scopes" TEXT[],
    "lastFour" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntegrationApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentEvent" (
    "id" TEXT NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FraudFlag" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "campaignId" TEXT,
    "type" TEXT NOT NULL,
    "severity" INTEGER NOT NULL,
    "state" "RiskState" NOT NULL DEFAULT 'FLAGGED',
    "privacySafeData" JSONB NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "FraudFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModerationCase" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "subjectUserId" TEXT,
    "campaignId" TEXT,
    "assignedToId" TEXT,
    "summary" TEXT NOT NULL,
    "evidence" JSONB NOT NULL,
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModerationCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "beforeSnapshot" JSONB,
    "afterSnapshot" JSONB,
    "reason" TEXT,
    "requestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureFlag" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "rules" JSONB NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyQuest" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "target" INTEGER NOT NULL,
    "sparksReward" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "DailyQuest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserQuest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questId" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "questDate" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserQuest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Badge" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "rarity" TEXT NOT NULL,

    CONSTRAINT "Badge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BadgeAward" (
    "id" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BadgeAward_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_firebaseUid_key" ON "User"("firebaseUid");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE INDEX "User_reputationScore_idx" ON "User"("reputationScore");

-- CreateIndex
CREATE UNIQUE INDEX "MinecraftIdentity_uuid_key" ON "MinecraftIdentity"("uuid");

-- CreateIndex
CREATE INDEX "MinecraftIdentity_userId_idx" ON "MinecraftIdentity"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Server_slug_key" ON "Server"("slug");

-- CreateIndex
CREATE INDEX "Server_ownerId_idx" ON "Server"("ownerId");

-- CreateIndex
CREATE INDEX "Server_publicListing_moderationStatus_idx" ON "Server"("publicListing", "moderationStatus");

-- CreateIndex
CREATE INDEX "ServerVerification_serverId_status_idx" ON "ServerVerification"("serverId", "status");

-- CreateIndex
CREATE INDEX "Campaign_status_startsAt_endsAt_idx" ON "Campaign"("status", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "Campaign_serverId_idx" ON "Campaign"("serverId");

-- CreateIndex
CREATE INDEX "Campaign_ownerId_idx" ON "Campaign"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "MilestoneTemplate_type_key" ON "MilestoneTemplate"("type");

-- CreateIndex
CREATE INDEX "CampaignMilestone_campaignId_idx" ON "CampaignMilestone"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignMilestone_campaignId_order_key" ON "CampaignMilestone"("campaignId", "order");

-- CreateIndex
CREATE INDEX "CampaignParticipation_campaignId_status_idx" ON "CampaignParticipation"("campaignId", "status");

-- CreateIndex
CREATE INDEX "CampaignParticipation_playerId_status_idx" ON "CampaignParticipation"("playerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignParticipation_playerId_campaignId_key" ON "CampaignParticipation"("playerId", "campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "MilestoneCompletion_rewardTransactionId_key" ON "MilestoneCompletion"("rewardTransactionId");

-- CreateIndex
CREATE UNIQUE INDEX "MilestoneCompletion_sparksTransactionId_key" ON "MilestoneCompletion"("sparksTransactionId");

-- CreateIndex
CREATE INDEX "MilestoneCompletion_status_submittedAt_idx" ON "MilestoneCompletion"("status", "submittedAt");

-- CreateIndex
CREATE UNIQUE INDEX "MilestoneCompletion_participationId_milestoneId_key" ON "MilestoneCompletion"("participationId", "milestoneId");

-- CreateIndex
CREATE UNIQUE INDEX "FeedbackResponse_participationId_key" ON "FeedbackResponse"("participationId");

-- CreateIndex
CREATE UNIQUE INDEX "Review_serverId_playerId_key" ON "Review"("serverId", "playerId");

-- CreateIndex
CREATE INDEX "WithdrawalRequest_status_createdAt_idx" ON "WithdrawalRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "WithdrawalRequest_playerId_idx" ON "WithdrawalRequest"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "EarningsLedgerEntry_idempotencyKey_key" ON "EarningsLedgerEntry"("idempotencyKey");

-- CreateIndex
CREATE INDEX "EarningsLedgerEntry_userId_currency_createdAt_idx" ON "EarningsLedgerEntry"("userId", "currency", "createdAt");

-- CreateIndex
CREATE INDEX "EarningsLedgerEntry_referenceType_referenceId_idx" ON "EarningsLedgerEntry"("referenceType", "referenceId");

-- CreateIndex
CREATE UNIQUE INDEX "SparksLedgerEntry_idempotencyKey_key" ON "SparksLedgerEntry"("idempotencyKey");

-- CreateIndex
CREATE INDEX "SparksLedgerEntry_userId_createdAt_idx" ON "SparksLedgerEntry"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignCreditLedgerEntry_idempotencyKey_key" ON "CampaignCreditLedgerEntry"("idempotencyKey");

-- CreateIndex
CREATE INDEX "CampaignCreditLedgerEntry_ownerId_createdAt_idx" ON "CampaignCreditLedgerEntry"("ownerId", "createdAt");

-- CreateIndex
CREATE INDEX "CampaignCreditLedgerEntry_expiresAt_idx" ON "CampaignCreditLedgerEntry"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "CosmeticItem_slug_key" ON "CosmeticItem"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "CosmeticPurchase_sparksLedgerEntryId_key" ON "CosmeticPurchase"("sparksLedgerEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "CosmeticPurchase_userId_itemId_key" ON "CosmeticPurchase"("userId", "itemId");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_campaignId_type_occurredAt_idx" ON "AnalyticsEvent"("campaignId", "type", "occurredAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_serverId_occurredAt_idx" ON "AnalyticsEvent"("serverId", "occurredAt");

-- CreateIndex
CREATE INDEX "IntegrationApiKey_serverId_idx" ON "IntegrationApiKey"("serverId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentEvent_providerEventId_key" ON "PaymentEvent"("providerEventId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentEvent_idempotencyKey_key" ON "PaymentEvent"("idempotencyKey");

-- CreateIndex
CREATE INDEX "FraudFlag_state_severity_idx" ON "FraudFlag"("state", "severity");

-- CreateIndex
CREATE INDEX "ModerationCase_status_priority_idx" ON "ModerationCase"("status", "priority");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_createdAt_idx" ON "AuditLog"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureFlag_key_key" ON "FeatureFlag"("key");

-- CreateIndex
CREATE UNIQUE INDEX "DailyQuest_slug_key" ON "DailyQuest"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "UserQuest_userId_questId_questDate_key" ON "UserQuest"("userId", "questId", "questDate");

-- CreateIndex
CREATE UNIQUE INDEX "Badge_slug_key" ON "Badge"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "BadgeAward_badgeId_userId_key" ON "BadgeAward"("badgeId", "userId");

-- AddForeignKey
ALTER TABLE "MinecraftIdentity" ADD CONSTRAINT "MinecraftIdentity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Server" ADD CONSTRAINT "Server_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServerVerification" ADD CONSTRAINT "ServerVerification_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignMilestone" ADD CONSTRAINT "CampaignMilestone_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignParticipation" ADD CONSTRAINT "CampaignParticipation_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignParticipation" ADD CONSTRAINT "CampaignParticipation_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignParticipation" ADD CONSTRAINT "CampaignParticipation_minecraftIdentityId_fkey" FOREIGN KEY ("minecraftIdentityId") REFERENCES "MinecraftIdentity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MilestoneCompletion" ADD CONSTRAINT "MilestoneCompletion_participationId_fkey" FOREIGN KEY ("participationId") REFERENCES "CampaignParticipation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MilestoneCompletion" ADD CONSTRAINT "MilestoneCompletion_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "CampaignMilestone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MilestoneCompletion" ADD CONSTRAINT "MilestoneCompletion_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MilestoneCompletion" ADD CONSTRAINT "MilestoneCompletion_rewardTransactionId_fkey" FOREIGN KEY ("rewardTransactionId") REFERENCES "EarningsLedgerEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MilestoneCompletion" ADD CONSTRAINT "MilestoneCompletion_sparksTransactionId_fkey" FOREIGN KEY ("sparksTransactionId") REFERENCES "SparksLedgerEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackResponse" ADD CONSTRAINT "FeedbackResponse_participationId_fkey" FOREIGN KEY ("participationId") REFERENCES "CampaignParticipation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WithdrawalRequest" ADD CONSTRAINT "WithdrawalRequest_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WithdrawalRequest" ADD CONSTRAINT "WithdrawalRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EarningsLedgerEntry" ADD CONSTRAINT "EarningsLedgerEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EarningsLedgerEntry" ADD CONSTRAINT "EarningsLedgerEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SparksLedgerEntry" ADD CONSTRAINT "SparksLedgerEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SparksLedgerEntry" ADD CONSTRAINT "SparksLedgerEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignCreditLedgerEntry" ADD CONSTRAINT "CampaignCreditLedgerEntry_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignCreditLedgerEntry" ADD CONSTRAINT "CampaignCreditLedgerEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CosmeticPurchase" ADD CONSTRAINT "CosmeticPurchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CosmeticPurchase" ADD CONSTRAINT "CosmeticPurchase_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "CosmeticItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_participationId_fkey" FOREIGN KEY ("participationId") REFERENCES "CampaignParticipation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationApiKey" ADD CONSTRAINT "IntegrationApiKey_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FraudFlag" ADD CONSTRAINT "FraudFlag_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FraudFlag" ADD CONSTRAINT "FraudFlag_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FraudFlag" ADD CONSTRAINT "FraudFlag_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationCase" ADD CONSTRAINT "ModerationCase_subjectUserId_fkey" FOREIGN KEY ("subjectUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationCase" ADD CONSTRAINT "ModerationCase_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationCase" ADD CONSTRAINT "ModerationCase_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserQuest" ADD CONSTRAINT "UserQuest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserQuest" ADD CONSTRAINT "UserQuest_questId_fkey" FOREIGN KEY ("questId") REFERENCES "DailyQuest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BadgeAward" ADD CONSTRAINT "BadgeAward_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "Badge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BadgeAward" ADD CONSTRAINT "BadgeAward_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
