CREATE TYPE "ServerStoreItemStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'UNPUBLISHED');

ALTER TABLE "ServerStoreItem"
ADD COLUMN "status" "ServerStoreItemStatus" NOT NULL DEFAULT 'DRAFT';

UPDATE "ServerStoreItem"
SET "status" = CASE
  WHEN "available" = TRUE THEN 'PUBLISHED'::"ServerStoreItemStatus"
  ELSE 'UNPUBLISHED'::"ServerStoreItemStatus"
END;

DROP INDEX IF EXISTS "ServerStoreItem_storeId_available_sortOrder_idx";

ALTER TABLE "ServerStoreItem"
DROP COLUMN "available";

CREATE INDEX "ServerStoreItem_storeId_status_sortOrder_idx"
ON "ServerStoreItem"("storeId", "status", "sortOrder");

CREATE TABLE "ServerStoreMediaAsset" (
  "id" UUID NOT NULL,
  "serverId" TEXT NOT NULL,
  "uploadedById" TEXT NOT NULL,
  "storageKey" TEXT NOT NULL,
  "contentType" TEXT NOT NULL,
  "byteSize" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ServerStoreMediaAsset_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ServerStoreMediaAsset_storageKey_key"
ON "ServerStoreMediaAsset"("storageKey");

CREATE INDEX "ServerStoreMediaAsset_serverId_createdAt_idx"
ON "ServerStoreMediaAsset"("serverId", "createdAt");

CREATE INDEX "ServerStoreMediaAsset_uploadedById_createdAt_idx"
ON "ServerStoreMediaAsset"("uploadedById", "createdAt");

ALTER TABLE "ServerStoreMediaAsset"
ADD CONSTRAINT "ServerStoreMediaAsset_serverId_fkey"
FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ServerStoreMediaAsset"
ADD CONSTRAINT "ServerStoreMediaAsset_uploadedById_fkey"
FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
