ALTER TABLE "IntegrationApiKey"
ALTER COLUMN "keyHash" DROP NOT NULL,
ADD COLUMN "algorithm" TEXT NOT NULL DEFAULT 'LEGACY_TOKEN_SHA256',
ADD COLUMN "publicKey" TEXT;

CREATE TABLE "PluginRequestNonce" (
  "id" TEXT NOT NULL,
  "credentialId" TEXT NOT NULL,
  "nonce" TEXT NOT NULL,
  "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PluginRequestNonce_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PluginRequestNonce_credentialId_nonce_key"
ON "PluginRequestNonce"("credentialId", "nonce");

CREATE INDEX "PluginRequestNonce_expiresAt_idx"
ON "PluginRequestNonce"("expiresAt");

CREATE UNIQUE INDEX "IntegrationApiKey_active_plugin_signing_key_idx"
ON "IntegrationApiKey"("serverId")
WHERE "revokedAt" IS NULL AND "algorithm" = 'ECDSA_P256_SHA256';

ALTER TABLE "PluginRequestNonce"
ADD CONSTRAINT "PluginRequestNonce_credentialId_fkey"
FOREIGN KEY ("credentialId") REFERENCES "IntegrationApiKey"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
