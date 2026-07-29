ALTER TYPE "ServerStorePurchaseStatus" RENAME VALUE 'QUEUED' TO 'PURCHASED';
ALTER TYPE "ServerStorePurchaseStatus" RENAME VALUE 'PROCESSING' TO 'PENDING_DELIVERY';

CREATE TYPE "ServerStoreProceedsType" AS ENUM (
  'DELIVERY_CREDIT',
  'WITHDRAWAL_RESERVATION',
  'WITHDRAWAL_RELEASE',
  'MANUAL_ADJUSTMENT'
);

ALTER TABLE "ServerStorePurchase"
ADD COLUMN "ownerProceedsCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "refundEligibleUntil" TIMESTAMP(3),
ADD COLUMN "redeemedAt" TIMESTAMP(3);

UPDATE "ServerStorePurchase"
SET "refundEligibleUntil" = "createdAt" + INTERVAL '14 days'
WHERE "refundEligibleUntil" IS NULL;

ALTER TABLE "ServerStorePurchase"
ALTER COLUMN "refundEligibleUntil" SET NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'PURCHASED';

CREATE TABLE "ServerStorePayoutProfile" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerAccountReference" TEXT NOT NULL,
  "displayLabel" TEXT NOT NULL,
  "verifiedAt" TIMESTAMP(3),
  "disabledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ServerStorePayoutProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ServerStorePayoutRequest" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "payoutProfileId" TEXT NOT NULL,
  "requestedCents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "idempotencyKey" TEXT NOT NULL,
  "status" "WithdrawalStatus" NOT NULL DEFAULT 'REQUESTED',
  "providerReference" TEXT,
  "reason" TEXT,
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ServerStorePayoutRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ServerStoreProceedsEntry" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "storeId" TEXT,
  "purchaseId" TEXT,
  "payoutRequestId" TEXT,
  "direction" "LedgerDirection" NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "type" "ServerStoreProceedsType" NOT NULL,
  "availableAt" TIMESTAMP(3) NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "internalNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ServerStoreProceedsEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ServerStorePayoutProfile_ownerId_key"
ON "ServerStorePayoutProfile"("ownerId");
CREATE UNIQUE INDEX "ServerStorePayoutProfile_provider_providerAccountReference_key"
ON "ServerStorePayoutProfile"("provider", "providerAccountReference");
CREATE INDEX "ServerStorePayoutRequest_ownerId_createdAt_idx"
ON "ServerStorePayoutRequest"("ownerId", "createdAt");
CREATE INDEX "ServerStorePayoutRequest_status_createdAt_idx"
ON "ServerStorePayoutRequest"("status", "createdAt");
CREATE UNIQUE INDEX "ServerStorePayoutRequest_idempotencyKey_key"
ON "ServerStorePayoutRequest"("idempotencyKey");
CREATE UNIQUE INDEX "ServerStoreProceedsEntry_purchaseId_key"
ON "ServerStoreProceedsEntry"("purchaseId");
CREATE UNIQUE INDEX "ServerStoreProceedsEntry_idempotencyKey_key"
ON "ServerStoreProceedsEntry"("idempotencyKey");
CREATE INDEX "ServerStoreProceedsEntry_ownerId_currency_availableAt_idx"
ON "ServerStoreProceedsEntry"("ownerId", "currency", "availableAt");
CREATE INDEX "ServerStoreProceedsEntry_storeId_createdAt_idx"
ON "ServerStoreProceedsEntry"("storeId", "createdAt");
CREATE INDEX "ServerStoreProceedsEntry_payoutRequestId_idx"
ON "ServerStoreProceedsEntry"("payoutRequestId");

ALTER TABLE "ServerStorePayoutProfile" ADD CONSTRAINT "ServerStorePayoutProfile_ownerId_fkey"
FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServerStorePayoutRequest" ADD CONSTRAINT "ServerStorePayoutRequest_ownerId_fkey"
FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServerStorePayoutRequest" ADD CONSTRAINT "ServerStorePayoutRequest_payoutProfileId_fkey"
FOREIGN KEY ("payoutProfileId") REFERENCES "ServerStorePayoutProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServerStorePayoutRequest" ADD CONSTRAINT "ServerStorePayoutRequest_reviewedById_fkey"
FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ServerStoreProceedsEntry" ADD CONSTRAINT "ServerStoreProceedsEntry_ownerId_fkey"
FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServerStoreProceedsEntry" ADD CONSTRAINT "ServerStoreProceedsEntry_storeId_fkey"
FOREIGN KEY ("storeId") REFERENCES "ServerStore"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServerStoreProceedsEntry" ADD CONSTRAINT "ServerStoreProceedsEntry_purchaseId_fkey"
FOREIGN KEY ("purchaseId") REFERENCES "ServerStorePurchase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServerStoreProceedsEntry" ADD CONSTRAINT "ServerStoreProceedsEntry_payoutRequestId_fkey"
FOREIGN KEY ("payoutRequestId") REFERENCES "ServerStorePayoutRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
