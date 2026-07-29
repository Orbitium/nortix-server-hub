ALTER TYPE "SparksTransactionType" ADD VALUE 'HYPE_PURCHASE';

ALTER TABLE "Server"
  ADD COLUMN "hypeScore" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "hypePeriodStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD CONSTRAINT "Server_hypeScore_check" CHECK ("hypeScore" >= 0);

CREATE TABLE "HypePurchase" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "serverId" TEXT NOT NULL,
  "hypeAmount" INTEGER NOT NULL DEFAULT 5,
  "sparksCost" INTEGER NOT NULL DEFAULT 500,
  "periodStart" TIMESTAMP(3) NOT NULL,
  "purchaseDate" TIMESTAMP(3) NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "ledgerEntryId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HypePurchase_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "HypePurchase_hypeAmount_check" CHECK ("hypeAmount" = 5),
  CONSTRAINT "HypePurchase_sparksCost_check" CHECK ("sparksCost" = 500)
);

CREATE UNIQUE INDEX "HypePurchase_idempotencyKey_key" ON "HypePurchase"("idempotencyKey");
CREATE UNIQUE INDEX "HypePurchase_ledgerEntryId_key" ON "HypePurchase"("ledgerEntryId");
CREATE INDEX "HypePurchase_userId_serverId_purchaseDate_idx"
  ON "HypePurchase"("userId", "serverId", "purchaseDate");
CREATE INDEX "HypePurchase_serverId_periodStart_idx"
  ON "HypePurchase"("serverId", "periodStart");

ALTER TABLE "HypePurchase"
  ADD CONSTRAINT "HypePurchase_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HypePurchase"
  ADD CONSTRAINT "HypePurchase_serverId_fkey"
  FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HypePurchase"
  ADD CONSTRAINT "HypePurchase_ledgerEntryId_fkey"
  FOREIGN KEY ("ledgerEntryId") REFERENCES "SparksLedgerEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
