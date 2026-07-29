ALTER TYPE "SparksTransactionType" ADD VALUE 'SERVER_AWARD_PURCHASE';

CREATE TYPE "ServerAwardKind" AS ENUM (
  'LOVE_IT',
  'FIRE',
  'CROWN',
  'GOAT',
  'FUNNY',
  'CLOWN',
  'DEAD',
  'CIRCUS',
  'SMART_DEV',
  'ADDICTING',
  'BEAUTIFUL'
);

CREATE TABLE "ServerAwardPurchase" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "serverId" TEXT NOT NULL,
  "kind" "ServerAwardKind" NOT NULL,
  "sparksCost" INTEGER NOT NULL,
  "showGiver" BOOLEAN NOT NULL DEFAULT false,
  "purchaseDate" TIMESTAMP(3) NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "ledgerEntryId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ServerAwardPurchase_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ServerAwardPurchase_sparksCost_check" CHECK ("sparksCost" > 0)
);

CREATE UNIQUE INDEX "ServerAwardPurchase_idempotencyKey_key"
  ON "ServerAwardPurchase"("idempotencyKey");
CREATE UNIQUE INDEX "ServerAwardPurchase_ledgerEntryId_key"
  ON "ServerAwardPurchase"("ledgerEntryId");
CREATE INDEX "ServerAwardPurchase_serverId_kind_createdAt_idx"
  ON "ServerAwardPurchase"("serverId", "kind", "createdAt");
CREATE INDEX "ServerAwardPurchase_userId_serverId_purchaseDate_idx"
  ON "ServerAwardPurchase"("userId", "serverId", "purchaseDate");

ALTER TABLE "ServerAwardPurchase"
  ADD CONSTRAINT "ServerAwardPurchase_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServerAwardPurchase"
  ADD CONSTRAINT "ServerAwardPurchase_serverId_fkey"
  FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServerAwardPurchase"
  ADD CONSTRAINT "ServerAwardPurchase_ledgerEntryId_fkey"
  FOREIGN KEY ("ledgerEntryId") REFERENCES "SparksLedgerEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
