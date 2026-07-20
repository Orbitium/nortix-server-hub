ALTER TABLE "Campaign"
ADD COLUMN "minimumSparksReward" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "maximumSparksReward" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "potentialExposureMin" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "potentialExposureMax" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "automaticVerification" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "Campaign"
ADD CONSTRAINT "Campaign_sparks_reward_range_check"
CHECK (
  "minimumSparksReward" >= 0
  AND "maximumSparksReward" >= "minimumSparksReward"
);

ALTER TABLE "Campaign"
ADD CONSTRAINT "Campaign_exposure_range_check"
CHECK (
  "potentialExposureMin" >= 0
  AND "potentialExposureMax" >= "potentialExposureMin"
  AND "potentialExposureMax" <= "maxParticipants"
);
