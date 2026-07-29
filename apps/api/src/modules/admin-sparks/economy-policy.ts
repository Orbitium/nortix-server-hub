import type { SparksTransactionType } from "@nortix/database";

export const SPARK_LIABILITY_CENTS_PER_THOUSAND = 100;

export const SOURCE_KEYS = [
  "PLAYTESTS",
  "DAILY_QUESTS",
  "WEEKLY_QUESTS",
  "REWARDED_ADS",
  "REFERRALS",
  "PROMOTIONS",
  "MANUAL_GRANTS",
  "OTHER",
] as const;

export const SINK_KEYS = [
  "HYPE",
  "SERVER_AWARDS",
  "COSMETICS",
  "PROFILE_ITEMS",
  "SEASONAL_ITEMS",
  "GIFT_REWARDS",
  "MARKETPLACE_FEES",
  "OTHER",
] as const;

export type SourceKey = (typeof SOURCE_KEYS)[number];
export type SinkKey = (typeof SINK_KEYS)[number];

export const SOURCE_LABELS: Record<SourceKey, string> = {
  PLAYTESTS: "Playtests",
  DAILY_QUESTS: "Daily quests",
  WEEKLY_QUESTS: "Weekly quests",
  REWARDED_ADS: "Rewarded ads",
  REFERRALS: "Referrals",
  PROMOTIONS: "Promotions",
  MANUAL_GRANTS: "Manual admin grants",
  OTHER: "Other sources",
};

export const SINK_LABELS: Record<SinkKey, string> = {
  HYPE: "Hype",
  SERVER_AWARDS: "Server Awards",
  COSMETICS: "Cosmetics",
  PROFILE_ITEMS: "Profile items",
  SEASONAL_ITEMS: "Seasonal items",
  GIFT_REWARDS: "Gift rewards",
  MARKETPLACE_FEES: "Marketplace fees",
  OTHER: "Other sinks",
};

export const isRedemptionDebit = (type: SparksTransactionType) =>
  type === "SPONSORED_PURCHASE" || type === "SERVER_STORE_PURCHASE";

export const isRedemptionRefund = (type: SparksTransactionType) =>
  type === "SPONSORED_PURCHASE_REFUND" || type === "SERVER_STORE_PURCHASE_REFUND";

export const sourceForTransaction = (type: SparksTransactionType): SourceKey | null => {
  if (isRedemptionRefund(type)) return null;
  switch (type) {
    case "CAMPAIGN_REWARD":
      return "PLAYTESTS";
    case "DAILY_QUEST":
      return "DAILY_QUESTS";
    case "REFERRAL":
      return "REFERRALS";
    case "SEASONAL_EVENT":
      return "PROMOTIONS";
    case "MANUAL_ADJUSTMENT":
      return "MANUAL_GRANTS";
    default:
      return "OTHER";
  }
};

export const sinkForTransaction = (
  type: SparksTransactionType,
  cosmeticSegment?: "COSMETICS" | "PROFILE_ITEMS" | "SEASONAL_ITEMS",
): SinkKey | null => {
  switch (type) {
    case "HYPE_PURCHASE":
      return "HYPE";
    case "SERVER_AWARD_PURCHASE":
      return "SERVER_AWARDS";
    case "COSMETIC_PURCHASE":
      return cosmeticSegment ?? "COSMETICS";
    case "SPONSORED_PURCHASE":
    case "SERVER_STORE_PURCHASE":
      return "GIFT_REWARDS";
    case "SPONSORED_PURCHASE_REFUND":
    case "SERVER_STORE_PURCHASE_REFUND":
      return null;
    default:
      return "OTHER";
  }
};

export const sparkLiabilityCents = (sparks: number) =>
  Math.round((Math.max(0, sparks) * SPARK_LIABILITY_CENTS_PER_THOUSAND) / 1_000);

export const safeRate = (numerator: number, denominator: number) =>
  denominator > 0 ? numerator / denominator : 0;

export const percentChange = (current: number, previous: number) =>
  previous > 0 ? ((current - previous) / previous) * 100 : current > 0 ? 100 : 0;

export const median = (values: readonly number[]) => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2
    : (sorted[middle] ?? 0);
};

export type EconomyAlertInput = {
  issuedToday: number;
  trailingAverageIssued: number;
  redeemedToday: number;
  trailingAverageRedeemed: number;
  burnRate: number;
  inflationToday: number;
  largestManualGrant: number;
  highBalanceUsers: number;
  suspiciousUsers: number;
  maxAdsPerUserToday: number;
  adDailyLimit: number;
};

export const economyAlerts = (input: EconomyAlertInput) => {
  const alerts: Array<{
    code: string;
    severity: "INFO" | "WARNING" | "CRITICAL";
    title: string;
    detail: string;
  }> = [];
  if (
    input.issuedToday >= 1_000 &&
    input.issuedToday > Math.max(1, input.trailingAverageIssued) * 2
  ) {
    alerts.push({
      code: "SUDDEN_INFLATION",
      severity: "CRITICAL",
      title: "Sudden Spark inflation",
      detail: "Today’s issuance is more than twice the trailing daily average.",
    });
  }
  if (
    input.redeemedToday >= 1_000 &&
    input.redeemedToday > Math.max(1, input.trailingAverageRedeemed) * 2
  ) {
    alerts.push({
      code: "REDEMPTION_SPIKE",
      severity: "WARNING",
      title: "Unusual redemption spike",
      detail: "Today’s real-cost redemption volume is above twice the trailing average.",
    });
  }
  if (input.largestManualGrant >= 5_000) {
    alerts.push({
      code: "LARGE_MANUAL_GRANT",
      severity: "WARNING",
      title: "Large manual grant",
      detail: `A manual grant of ${input.largestManualGrant.toLocaleString()} Sparks was recorded in the selected range.`,
    });
  }
  if (input.maxAdsPerUserToday > input.adDailyLimit) {
    alerts.push({
      code: "REWARDED_AD_ABUSE",
      severity: "CRITICAL",
      title: "Possible rewarded-ad abuse",
      detail: "An account exceeded the expected daily rewarded-ad completion limit.",
    });
  }
  if (input.highBalanceUsers > 0) {
    alerts.push({
      code: "HIGH_BALANCE",
      severity: "WARNING",
      title: "Extremely high Spark balances",
      detail: `${input.highBalanceUsers.toLocaleString()} account(s) hold at least 100,000 Sparks.`,
    });
  }
  if (input.suspiciousUsers > 0) {
    alerts.push({
      code: "SUSPICIOUS_ACCOUNTS",
      severity: "WARNING",
      title: "Suspicious account activity",
      detail: `${input.suspiciousUsers.toLocaleString()} high-impact account(s) require review.`,
    });
  }
  if (input.inflationToday > 0 && input.burnRate < 0.2) {
    alerts.push({
      code: "LOW_BURN_RATE",
      severity: "INFO",
      title: "Low burn rate",
      detail: "Less than 20% of today’s issued Sparks were removed through non-redemption sinks.",
    });
  }
  return alerts;
};
