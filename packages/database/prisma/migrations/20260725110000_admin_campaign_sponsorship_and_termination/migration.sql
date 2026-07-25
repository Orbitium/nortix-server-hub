ALTER TYPE "CampaignStatus" ADD VALUE 'TERMINATED';

CREATE TYPE "CampaignFundingSource" AS ENUM ('OWNER_CREDITS', 'NORTIX_SPONSORED');
CREATE TYPE "CampaignTerminationRefundPolicy" AS ENUM (
  'REFUND_ALL',
  'REFUND_UNUSED',
  'NO_REFUND'
);

ALTER TABLE "Campaign"
ADD COLUMN "fundingSource" "CampaignFundingSource" NOT NULL DEFAULT 'OWNER_CREDITS',
ADD COLUMN "creditCostPerParticipant" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "consumedBudgetCredits" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "createdByAdminId" TEXT;

UPDATE "Campaign"
SET "creditCostPerParticipant" = CASE
  WHEN "campaignBudgetCredits" <= 0 OR "maxParticipants" <= 0 THEN 0
  ELSE CEIL("campaignBudgetCredits"::numeric / "maxParticipants")::integer
END;

UPDATE "Campaign" AS campaign
SET "consumedBudgetCredits" = LEAST(
  campaign."campaignBudgetCredits",
  campaign."creditCostPerParticipant" * (
    SELECT COUNT(*)::integer
    FROM "CampaignParticipation" AS participation
    WHERE participation."campaignId" = campaign.id
  )
);

ALTER TABLE "Campaign"
ADD CONSTRAINT "Campaign_createdByAdminId_fkey"
FOREIGN KEY ("createdByAdminId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Campaign"
ADD CONSTRAINT "Campaign_credit_accounting_check"
CHECK (
  "campaignBudgetCredits" >= 0
  AND "creditCostPerParticipant" >= 0
  AND "consumedBudgetCredits" >= 0
  AND "consumedBudgetCredits" <= "campaignBudgetCredits"
);

CREATE TABLE "CampaignTermination" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "terminatedById" TEXT NOT NULL,
  "previousStatus" "CampaignStatus" NOT NULL,
  "fundingSource" "CampaignFundingSource" NOT NULL,
  "refundPolicy" "CampaignTerminationRefundPolicy" NOT NULL,
  "reason" TEXT,
  "allocatedCredits" INTEGER NOT NULL,
  "consumedCredits" INTEGER NOT NULL,
  "refundedCredits" INTEGER NOT NULL,
  "purchasedRefundCredits" INTEGER NOT NULL DEFAULT 0,
  "promotionalRefundCredits" INTEGER NOT NULL DEFAULT 0,
  "terminatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CampaignTermination_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CampaignTermination_credit_snapshot_check" CHECK (
    "allocatedCredits" >= 0
    AND "consumedCredits" >= 0
    AND "refundedCredits" >= 0
    AND "purchasedRefundCredits" >= 0
    AND "promotionalRefundCredits" >= 0
    AND "consumedCredits" <= "allocatedCredits"
    AND "refundedCredits" <= "allocatedCredits"
    AND "purchasedRefundCredits" + "promotionalRefundCredits" = "refundedCredits"
  )
);

CREATE UNIQUE INDEX "CampaignTermination_campaignId_key"
ON "CampaignTermination"("campaignId");
CREATE INDEX "CampaignTermination_terminatedById_terminatedAt_idx"
ON "CampaignTermination"("terminatedById", "terminatedAt");
CREATE INDEX "CampaignTermination_terminatedAt_idx"
ON "CampaignTermination"("terminatedAt");
CREATE INDEX "Campaign_fundingSource_status_idx"
ON "Campaign"("fundingSource", "status");

ALTER TABLE "CampaignTermination"
ADD CONSTRAINT "CampaignTermination_campaignId_fkey"
FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CampaignTermination"
ADD CONSTRAINT "CampaignTermination_terminatedById_fkey"
FOREIGN KEY ("terminatedById") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
