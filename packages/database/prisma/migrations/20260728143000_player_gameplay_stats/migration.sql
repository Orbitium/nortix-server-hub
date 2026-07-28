ALTER TABLE "AnalyticsEvent" ADD COLUMN "profileAggregatedAt" TIMESTAMP(3);

CREATE TABLE "PlayerGameplayDailyStat" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "serverId" TEXT NOT NULL,
  "activityDate" TIMESTAMP(3) NOT NULL,
  "joins" INTEGER NOT NULL DEFAULT 0,
  "playtimeSeconds" INTEGER NOT NULL DEFAULT 0,
  "playerKills" INTEGER NOT NULL DEFAULT 0,
  "mobKills" INTEGER NOT NULL DEFAULT 0,
  "blocksBroken" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PlayerGameplayDailyStat_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlayerGameplayDailyStat_userId_serverId_activityDate_key"
  ON "PlayerGameplayDailyStat"("userId", "serverId", "activityDate");
CREATE INDEX "PlayerGameplayDailyStat_userId_activityDate_idx"
  ON "PlayerGameplayDailyStat"("userId", "activityDate");
CREATE INDEX "PlayerGameplayDailyStat_serverId_activityDate_idx"
  ON "PlayerGameplayDailyStat"("serverId", "activityDate");

ALTER TABLE "PlayerGameplayDailyStat"
  ADD CONSTRAINT "PlayerGameplayDailyStat_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlayerGameplayDailyStat"
  ADD CONSTRAINT "PlayerGameplayDailyStat_serverId_fkey"
  FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE CASCADE ON UPDATE CASCADE;
