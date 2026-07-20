ALTER TABLE "Server"
ADD COLUMN "pluginCapabilities" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN "pluginLastSeenAt" TIMESTAMP(3),
ADD COLUMN "pluginInstanceId" TEXT;

CREATE INDEX "IntegrationApiKey_keyHash_idx" ON "IntegrationApiKey"("keyHash");
