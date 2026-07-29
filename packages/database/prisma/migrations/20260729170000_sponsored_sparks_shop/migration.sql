ALTER TYPE "SparksTransactionType" ADD VALUE 'SPONSORED_PURCHASE';
ALTER TYPE "SparksTransactionType" ADD VALUE 'SPONSORED_PURCHASE_REFUND';

CREATE TYPE "SponsoredPurchaseStatus" AS ENUM (
  'REQUESTED',
  'PROCESSING',
  'DELIVERED',
  'CANCELLED',
  'REFUNDED'
);

CREATE TYPE "SponsoredFulfillmentField" AS ENUM (
  'MINECRAFT_USERNAME',
  'DISCORD_USERNAME',
  'EMAIL'
);

CREATE TABLE "SponsoredStore" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "websiteUrl" TEXT,
  "logoUrl" TEXT,
  "available" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SponsoredStore_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SponsoredItem" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "sparksPrice" INTEGER NOT NULL,
  "imageUrl" TEXT,
  "fulfillmentSummary" TEXT NOT NULL,
  "fulfillmentFields" "SponsoredFulfillmentField"[],
  "available" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SponsoredItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SponsoredItem_sparksPrice_check" CHECK ("sparksPrice" > 0)
);

CREATE TABLE "SponsoredPurchase" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "status" "SponsoredPurchaseStatus" NOT NULL DEFAULT 'REQUESTED',
  "priceSparks" INTEGER NOT NULL,
  "fulfillmentDetails" JSONB NOT NULL DEFAULT '{}',
  "deliveryReference" TEXT,
  "statusReason" TEXT,
  "adminNote" TEXT,
  "idempotencyKey" TEXT NOT NULL,
  "sparksDebitLedgerEntryId" TEXT NOT NULL,
  "sparksRefundLedgerEntryId" TEXT,
  "handledById" TEXT,
  "processingAt" TIMESTAMP(3),
  "deliveredAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "refundedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SponsoredPurchase_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SponsoredPurchase_priceSparks_check" CHECK ("priceSparks" > 0)
);

CREATE UNIQUE INDEX "SponsoredStore_slug_key" ON "SponsoredStore"("slug");
CREATE INDEX "SponsoredStore_available_sortOrder_idx" ON "SponsoredStore"("available", "sortOrder");
CREATE UNIQUE INDEX "SponsoredItem_storeId_slug_key" ON "SponsoredItem"("storeId", "slug");
CREATE INDEX "SponsoredItem_storeId_available_sortOrder_idx" ON "SponsoredItem"("storeId", "available", "sortOrder");
CREATE UNIQUE INDEX "SponsoredPurchase_idempotencyKey_key" ON "SponsoredPurchase"("idempotencyKey");
CREATE UNIQUE INDEX "SponsoredPurchase_sparksDebitLedgerEntryId_key" ON "SponsoredPurchase"("sparksDebitLedgerEntryId");
CREATE UNIQUE INDEX "SponsoredPurchase_sparksRefundLedgerEntryId_key" ON "SponsoredPurchase"("sparksRefundLedgerEntryId");
CREATE INDEX "SponsoredPurchase_userId_createdAt_idx" ON "SponsoredPurchase"("userId", "createdAt");
CREATE INDEX "SponsoredPurchase_status_createdAt_idx" ON "SponsoredPurchase"("status", "createdAt");
CREATE INDEX "SponsoredPurchase_itemId_status_idx" ON "SponsoredPurchase"("itemId", "status");

ALTER TABLE "SponsoredStore" ADD CONSTRAINT "SponsoredStore_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SponsoredItem" ADD CONSTRAINT "SponsoredItem_storeId_fkey"
FOREIGN KEY ("storeId") REFERENCES "SponsoredStore"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SponsoredPurchase" ADD CONSTRAINT "SponsoredPurchase_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SponsoredPurchase" ADD CONSTRAINT "SponsoredPurchase_itemId_fkey"
FOREIGN KEY ("itemId") REFERENCES "SponsoredItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SponsoredPurchase" ADD CONSTRAINT "SponsoredPurchase_sparksDebitLedgerEntryId_fkey"
FOREIGN KEY ("sparksDebitLedgerEntryId") REFERENCES "SparksLedgerEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SponsoredPurchase" ADD CONSTRAINT "SponsoredPurchase_sparksRefundLedgerEntryId_fkey"
FOREIGN KEY ("sparksRefundLedgerEntryId") REFERENCES "SparksLedgerEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SponsoredPurchase" ADD CONSTRAINT "SponsoredPurchase_handledById_fkey"
FOREIGN KEY ("handledById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
