CREATE TABLE "ServerActivitySample" (
    "id" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "onlinePlayers" INTEGER NOT NULL,
    "maxPlayers" INTEGER,
    "platform" TEXT NOT NULL,
    "pluginVersion" TEXT NOT NULL,
    "serverVersion" TEXT,
    "backendCounts" JSONB NOT NULL DEFAULT '{}',
    "playerHashes" TEXT[],

    CONSTRAINT "ServerActivitySample_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ServerActivitySample_serverId_observedAt_idx"
ON "ServerActivitySample"("serverId", "observedAt");

ALTER TABLE "ServerActivitySample"
ADD CONSTRAINT "ServerActivitySample_serverId_fkey"
FOREIGN KEY ("serverId") REFERENCES "Server"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
