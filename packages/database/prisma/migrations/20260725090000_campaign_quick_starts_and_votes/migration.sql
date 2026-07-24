ALTER TABLE "Campaign" ADD COLUMN "quickStart" TEXT;
ALTER TABLE "Campaign" ADD COLUMN "quickStartConfig" JSONB NOT NULL DEFAULT '{}';

CREATE TABLE "ServerVote" (
    "id" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ServerVote_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ServerVote_serverId_playerId_key" ON "ServerVote"("serverId", "playerId");
CREATE INDEX "ServerVote_serverId_createdAt_idx" ON "ServerVote"("serverId", "createdAt");
ALTER TABLE "ServerVote" ADD CONSTRAINT "ServerVote_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ServerVote" ADD CONSTRAINT "ServerVote_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
