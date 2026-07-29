ALTER TABLE "SponsoredPurchase"
ADD COLUMN "quantity" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "SponsoredPurchase"
ADD CONSTRAINT "SponsoredPurchase_quantity_check"
CHECK ("quantity" >= 1 AND "quantity" <= 10);
