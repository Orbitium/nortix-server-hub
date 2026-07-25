CREATE TYPE "CosmeticType" AS ENUM ('AVATAR', 'BANNER', 'BADGE', 'TITLE', 'THEME');
CREATE TYPE "CosmeticUnlockMethod" AS ENUM ('DEFAULT', 'LEVEL', 'SPARKS');

ALTER TABLE "User" ADD COLUMN "testerExperience" INTEGER NOT NULL DEFAULT 0;
UPDATE "User"
SET "testerExperience" = 500 * "testerLevel" * ("testerLevel" - 1)
WHERE "testerLevel" > 1;
ALTER TABLE "User"
  ADD CONSTRAINT "User_tester_experience_check" CHECK ("testerExperience" >= 0);

ALTER TABLE "CosmeticItem"
  ADD COLUMN "unlockMethod" "CosmeticUnlockMethod" NOT NULL DEFAULT 'SPARKS',
  ADD COLUMN "requiredLevel" INTEGER,
  ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "CosmeticItem"
  ALTER COLUMN "sparksPrice" SET DEFAULT 0;

ALTER TABLE "CosmeticItem"
  ALTER COLUMN "type" TYPE "CosmeticType"
  USING (
    CASE "type"
      WHEN 'PROFILE_FRAME' THEN 'AVATAR'
      WHEN 'PROFILE_BACKGROUND' THEN 'BANNER'
      WHEN 'BADGE' THEN 'BADGE'
      WHEN 'NAME_EFFECT' THEN 'TITLE'
      ELSE 'THEME'
    END
  )::"CosmeticType";

ALTER TABLE "CosmeticItem"
  ADD CONSTRAINT "CosmeticItem_unlock_requirement_check"
  CHECK (
    ("unlockMethod" = 'SPARKS' AND "sparksPrice" > 0 AND "requiredLevel" IS NULL)
    OR ("unlockMethod" = 'LEVEL' AND "requiredLevel" > 0 AND "sparksPrice" = 0)
    OR ("unlockMethod" = 'DEFAULT' AND "requiredLevel" IS NULL AND "sparksPrice" = 0)
  );

CREATE TABLE "EquippedCosmetic" (
  "userId" TEXT NOT NULL,
  "type" "CosmeticType" NOT NULL,
  "itemId" TEXT NOT NULL,
  "equippedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EquippedCosmetic_pkey" PRIMARY KEY ("userId", "type")
);

CREATE INDEX "CosmeticItem_type_available_sortOrder_idx"
  ON "CosmeticItem"("type", "available", "sortOrder");
CREATE INDEX "CosmeticItem_unlockMethod_requiredLevel_idx"
  ON "CosmeticItem"("unlockMethod", "requiredLevel");
CREATE UNIQUE INDEX "CosmeticItem_id_type_key" ON "CosmeticItem"("id", "type");
CREATE INDEX "EquippedCosmetic_itemId_idx" ON "EquippedCosmetic"("itemId");

ALTER TABLE "EquippedCosmetic"
  ADD CONSTRAINT "EquippedCosmetic_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EquippedCosmetic"
  ADD CONSTRAINT "EquippedCosmetic_itemId_fkey"
  FOREIGN KEY ("itemId", "type") REFERENCES "CosmeticItem"("id", "type") ON DELETE RESTRICT ON UPDATE CASCADE;
