ALTER TABLE "Server"
ADD COLUMN "normalizedHostname" TEXT;

UPDATE "Server"
SET "normalizedHostname" = LOWER(REGEXP_REPLACE(TRIM("hostname"), '\.$', ''));

ALTER TABLE "Server"
ALTER COLUMN "normalizedHostname" SET NOT NULL;

-- Keep the oldest claimed registration, or otherwise the oldest registration, active for an
-- owner's duplicate endpoint. Older application versions did not enforce this invariant.
WITH ranked AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "ownerId", "edition", "normalizedHostname", "port"
      ORDER BY "claimed" DESC, "createdAt" ASC, "id" ASC
    ) AS position
  FROM "Server"
  WHERE "verificationStatus" <> 'EXPIRED'
)
UPDATE "Server" AS server
SET
  "claimed" = FALSE,
  "verificationStatus" = 'EXPIRED',
  "publicListing" = FALSE
FROM ranked
WHERE server."id" = ranked."id"
  AND ranked.position > 1;

-- A public endpoint can have only one owner. Preserve the earliest historical claim if an older
-- deployment allowed conflicting claims.
WITH ranked_claims AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "edition", "normalizedHostname", "port"
      ORDER BY "createdAt" ASC, "id" ASC
    ) AS position
  FROM "Server"
  WHERE "claimed" = TRUE
)
UPDATE "Server" AS server
SET
  "claimed" = FALSE,
  "verificationStatus" = 'EXPIRED',
  "publicListing" = FALSE
FROM ranked_claims
WHERE server."id" = ranked_claims."id"
  AND ranked_claims.position > 1;

UPDATE "ServerVerification"
SET "status" = 'EXPIRED'
WHERE "status" = 'PENDING'
  AND "serverId" IN (
    SELECT "id" FROM "Server" WHERE "verificationStatus" = 'EXPIRED'
  );

UPDATE "IntegrationApiKey"
SET "revokedAt" = CURRENT_TIMESTAMP
WHERE "revokedAt" IS NULL
  AND "serverId" IN (
    SELECT "id" FROM "Server" WHERE "verificationStatus" = 'EXPIRED'
  );

CREATE UNIQUE INDEX "Server_owner_endpoint_active_key"
ON "Server"("ownerId", "edition", "normalizedHostname", "port")
WHERE "verificationStatus" <> 'EXPIRED';

CREATE UNIQUE INDEX "Server_endpoint_claimed_key"
ON "Server"("edition", "normalizedHostname", "port")
WHERE "claimed" = TRUE;

CREATE INDEX "Server_ownerId_edition_normalizedHostname_port_idx"
ON "Server"("ownerId", "edition", "normalizedHostname", "port");

CREATE INDEX "Server_edition_normalizedHostname_port_claimed_idx"
ON "Server"("edition", "normalizedHostname", "port", "claimed");
