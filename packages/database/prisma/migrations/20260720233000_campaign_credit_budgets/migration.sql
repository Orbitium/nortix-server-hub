ALTER TABLE "Campaign"
ADD COLUMN "campaignBudgetCredits" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Campaign"
ADD CONSTRAINT "Campaign_credit_budget_check"
CHECK ("campaignBudgetCredits" >= 0);
