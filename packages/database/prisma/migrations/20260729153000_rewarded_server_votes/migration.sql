ALTER TABLE "Server"
ADD COLUMN "rewardedVotingEnabled" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "ServerVote"
ADD COLUMN "weight" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "rewardedVoteSessionId" TEXT;

ALTER TABLE "ServerVote"
ADD CONSTRAINT "ServerVote_weight_check" CHECK ("weight" IN (1, 2));

CREATE TABLE "RewardedVoteSession" (
    "id" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RewardedVoteSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RewardedVoteSession_tokenHash_key"
ON "RewardedVoteSession"("tokenHash");

CREATE INDEX "RewardedVoteSession_playerId_createdAt_idx"
ON "RewardedVoteSession"("playerId", "createdAt");

CREATE INDEX "RewardedVoteSession_serverId_createdAt_idx"
ON "RewardedVoteSession"("serverId", "createdAt");

CREATE INDEX "RewardedVoteSession_expiresAt_idx"
ON "RewardedVoteSession"("expiresAt");

CREATE UNIQUE INDEX "ServerVote_rewardedVoteSessionId_key"
ON "ServerVote"("rewardedVoteSessionId");

ALTER TABLE "RewardedVoteSession"
ADD CONSTRAINT "RewardedVoteSession_serverId_fkey"
FOREIGN KEY ("serverId") REFERENCES "Server"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RewardedVoteSession"
ADD CONSTRAINT "RewardedVoteSession_playerId_fkey"
FOREIGN KEY ("playerId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ServerVote"
ADD CONSTRAINT "ServerVote_rewardedVoteSessionId_fkey"
FOREIGN KEY ("rewardedVoteSessionId") REFERENCES "RewardedVoteSession"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
