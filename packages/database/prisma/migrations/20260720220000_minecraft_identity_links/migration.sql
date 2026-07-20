CREATE TYPE "IdentityClaimStatus" AS ENUM ('PENDING', 'COMPLETED', 'EXPIRED', 'CANCELLED');
CREATE TYPE "CrackedLinkStatus" AS ENUM ('PENDING', 'ACTIVE', 'EXPIRED', 'RELEASED', 'PLAYED_BEFORE');
ALTER TABLE "Server" ADD COLUMN "playerHistorySyncedAt" TIMESTAMP(3);

CREATE TABLE "PremiumIdentityClaim" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "status" "IdentityClaimStatus" NOT NULL DEFAULT 'PENDING',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PremiumIdentityClaim_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MinecraftIdentityActivity" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "serverId" TEXT,
  "type" TEXT NOT NULL,
  "identityKind" TEXT NOT NULL,
  "minecraftUuid" TEXT,
  "minecraftUsername" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MinecraftIdentityActivity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ServerPlayerPresence" (
  "id" TEXT NOT NULL,
  "serverId" TEXT NOT NULL,
  "normalizedUsername" TEXT NOT NULL,
  "minecraftUsername" TEXT NOT NULL,
  "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ServerPlayerPresence_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CrackedAccountLink" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "serverId" TEXT NOT NULL,
  "minecraftUsername" TEXT NOT NULL,
  "normalizedUsername" TEXT NOT NULL,
  "status" "CrackedLinkStatus" NOT NULL DEFAULT 'PENDING',
  "reservedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "activatedAt" TIMESTAMP(3),
  "releasedAt" TIMESTAMP(3),
  "releaseReason" TEXT,
  CONSTRAINT "CrackedAccountLink_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "CampaignParticipation" ADD COLUMN "crackedAccountLinkId" TEXT;

CREATE UNIQUE INDEX "PremiumIdentityClaim_codeHash_key" ON "PremiumIdentityClaim"("codeHash");
CREATE INDEX "PremiumIdentityClaim_userId_status_createdAt_idx" ON "PremiumIdentityClaim"("userId", "status", "createdAt");
CREATE INDEX "PremiumIdentityClaim_status_expiresAt_idx" ON "PremiumIdentityClaim"("status", "expiresAt");
CREATE INDEX "MinecraftIdentityActivity_userId_createdAt_idx" ON "MinecraftIdentityActivity"("userId", "createdAt");
CREATE INDEX "MinecraftIdentityActivity_serverId_createdAt_idx" ON "MinecraftIdentityActivity"("serverId", "createdAt");
CREATE UNIQUE INDEX "ServerPlayerPresence_serverId_normalizedUsername_key" ON "ServerPlayerPresence"("serverId", "normalizedUsername");
CREATE INDEX "ServerPlayerPresence_serverId_lastSeenAt_idx" ON "ServerPlayerPresence"("serverId", "lastSeenAt");
CREATE INDEX "CrackedAccountLink_userId_reservedAt_idx" ON "CrackedAccountLink"("userId", "reservedAt");
CREATE INDEX "CrackedAccountLink_serverId_normalizedUsername_status_idx" ON "CrackedAccountLink"("serverId", "normalizedUsername", "status");
CREATE INDEX "CrackedAccountLink_status_expiresAt_idx" ON "CrackedAccountLink"("status", "expiresAt");
CREATE UNIQUE INDEX "CrackedAccountLink_one_open_name_per_server"
  ON "CrackedAccountLink"("serverId", "normalizedUsername")
  WHERE "status" IN ('PENDING', 'ACTIVE');
CREATE INDEX "CampaignParticipation_crackedAccountLinkId_idx" ON "CampaignParticipation"("crackedAccountLinkId");

ALTER TABLE "PremiumIdentityClaim" ADD CONSTRAINT "PremiumIdentityClaim_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MinecraftIdentityActivity" ADD CONSTRAINT "MinecraftIdentityActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MinecraftIdentityActivity" ADD CONSTRAINT "MinecraftIdentityActivity_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ServerPlayerPresence" ADD CONSTRAINT "ServerPlayerPresence_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CrackedAccountLink" ADD CONSTRAINT "CrackedAccountLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CrackedAccountLink" ADD CONSTRAINT "CrackedAccountLink_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CampaignParticipation" ADD CONSTRAINT "CampaignParticipation_crackedAccountLinkId_fkey" FOREIGN KEY ("crackedAccountLinkId") REFERENCES "CrackedAccountLink"("id") ON DELETE SET NULL ON UPDATE CASCADE;
