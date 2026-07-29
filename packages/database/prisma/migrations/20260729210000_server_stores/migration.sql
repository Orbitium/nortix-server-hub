ALTER TYPE "SparksTransactionType" ADD VALUE 'SERVER_STORE_PURCHASE';
ALTER TYPE "SparksTransactionType" ADD VALUE 'SERVER_STORE_PURCHASE_REFUND';

CREATE TYPE "ServerStorePurchaseStatus" AS ENUM (
  'QUEUED',
  'PROCESSING',
  'DELIVERED',
  'FAILED',
  'REFUNDED'
);

CREATE TYPE "ServerStoreDeliveryStatus" AS ENUM (
  'PENDING',
  'CLAIMED',
  'DELIVERED',
  'FAILED'
);

CREATE TABLE "ServerStore" (
  "id" TEXT NOT NULL,
  "serverId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "logoUrl" TEXT,
  "available" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ServerStore_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ServerStoreItem" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "sparksPrice" INTEGER NOT NULL,
  "imageUrls" TEXT[],
  "stockQuantity" INTEGER,
  "maxPerPurchase" INTEGER NOT NULL DEFAULT 1,
  "commandTemplates" TEXT[],
  "available" BOOLEAN NOT NULL DEFAULT false,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ServerStoreItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ServerStorePurchase" (
  "id" TEXT NOT NULL,
  "buyerId" TEXT NOT NULL,
  "recipientId" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "status" "ServerStorePurchaseStatus" NOT NULL DEFAULT 'QUEUED',
  "quantity" INTEGER NOT NULL,
  "priceSparks" INTEGER NOT NULL,
  "recipientMinecraftUsername" TEXT NOT NULL,
  "giftMessage" TEXT,
  "commandSnapshot" TEXT[],
  "idempotencyKey" TEXT NOT NULL,
  "sparksDebitLedgerEntryId" TEXT NOT NULL,
  "sparksRefundLedgerEntryId" TEXT,
  "deliveredAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "refundedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ServerStorePurchase_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ServerStoreDelivery" (
  "id" TEXT NOT NULL,
  "purchaseId" TEXT NOT NULL,
  "serverId" TEXT NOT NULL,
  "status" "ServerStoreDeliveryStatus" NOT NULL DEFAULT 'PENDING',
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "claimedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ServerStoreDelivery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ServerStore_serverId_key" ON "ServerStore"("serverId");
CREATE UNIQUE INDEX "ServerStoreItem_storeId_slug_key" ON "ServerStoreItem"("storeId", "slug");
CREATE INDEX "ServerStoreItem_storeId_available_sortOrder_idx"
ON "ServerStoreItem"("storeId", "available", "sortOrder");
CREATE UNIQUE INDEX "ServerStorePurchase_idempotencyKey_key"
ON "ServerStorePurchase"("idempotencyKey");
CREATE UNIQUE INDEX "ServerStorePurchase_sparksDebitLedgerEntryId_key"
ON "ServerStorePurchase"("sparksDebitLedgerEntryId");
CREATE UNIQUE INDEX "ServerStorePurchase_sparksRefundLedgerEntryId_key"
ON "ServerStorePurchase"("sparksRefundLedgerEntryId");
CREATE INDEX "ServerStorePurchase_buyerId_createdAt_idx"
ON "ServerStorePurchase"("buyerId", "createdAt");
CREATE INDEX "ServerStorePurchase_recipientId_createdAt_idx"
ON "ServerStorePurchase"("recipientId", "createdAt");
CREATE INDEX "ServerStorePurchase_itemId_status_idx"
ON "ServerStorePurchase"("itemId", "status");
CREATE UNIQUE INDEX "ServerStoreDelivery_purchaseId_key"
ON "ServerStoreDelivery"("purchaseId");
CREATE INDEX "ServerStoreDelivery_serverId_status_createdAt_idx"
ON "ServerStoreDelivery"("serverId", "status", "createdAt");

ALTER TABLE "ServerStore" ADD CONSTRAINT "ServerStore_serverId_fkey"
FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ServerStoreItem" ADD CONSTRAINT "ServerStoreItem_storeId_fkey"
FOREIGN KEY ("storeId") REFERENCES "ServerStore"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ServerStorePurchase" ADD CONSTRAINT "ServerStorePurchase_buyerId_fkey"
FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServerStorePurchase" ADD CONSTRAINT "ServerStorePurchase_recipientId_fkey"
FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServerStorePurchase" ADD CONSTRAINT "ServerStorePurchase_itemId_fkey"
FOREIGN KEY ("itemId") REFERENCES "ServerStoreItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServerStorePurchase" ADD CONSTRAINT "ServerStorePurchase_sparksDebitLedgerEntryId_fkey"
FOREIGN KEY ("sparksDebitLedgerEntryId") REFERENCES "SparksLedgerEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServerStorePurchase" ADD CONSTRAINT "ServerStorePurchase_sparksRefundLedgerEntryId_fkey"
FOREIGN KEY ("sparksRefundLedgerEntryId") REFERENCES "SparksLedgerEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServerStoreDelivery" ADD CONSTRAINT "ServerStoreDelivery_purchaseId_fkey"
FOREIGN KEY ("purchaseId") REFERENCES "ServerStorePurchase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ServerStoreDelivery" ADD CONSTRAINT "ServerStoreDelivery_serverId_fkey"
FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE CASCADE ON UPDATE CASCADE;
