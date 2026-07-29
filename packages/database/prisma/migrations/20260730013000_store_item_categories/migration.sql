CREATE TYPE "StoreItemCategory" AS ENUM (
  'RANKS',
  'COINS',
  'CRATES',
  'COSMETICS',
  'BOOSTERS',
  'SUBSCRIPTIONS',
  'BUNDLES',
  'OTHER'
);

ALTER TABLE "SponsoredItem"
ADD COLUMN "category" "StoreItemCategory" NOT NULL DEFAULT 'OTHER';

ALTER TABLE "ServerStoreItem"
ADD COLUMN "category" "StoreItemCategory" NOT NULL DEFAULT 'OTHER';

DROP INDEX "SponsoredItem_storeId_available_sortOrder_idx";
CREATE INDEX "SponsoredItem_storeId_available_category_sortOrder_idx"
ON "SponsoredItem"("storeId", "available", "category", "sortOrder");

DROP INDEX "ServerStoreItem_storeId_status_sortOrder_idx";
CREATE INDEX "ServerStoreItem_storeId_status_category_sortOrder_idx"
ON "ServerStoreItem"("storeId", "status", "category", "sortOrder");
