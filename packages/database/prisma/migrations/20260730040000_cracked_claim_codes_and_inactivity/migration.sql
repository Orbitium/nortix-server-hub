ALTER TABLE "CrackedAccountLink"
  ADD COLUMN "claimCodeHash" TEXT,
  ADD COLUMN "lastLoginAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "CrackedAccountLink_claimCodeHash_key"
  ON "CrackedAccountLink"("claimCodeHash");

UPDATE "CrackedAccountLink"
SET
  "lastLoginAt" = COALESCE("activatedAt", "reservedAt"),
  "expiresAt" = COALESCE("activatedAt", "reservedAt") + INTERVAL '30 days'
WHERE "status" = 'ACTIVE';
