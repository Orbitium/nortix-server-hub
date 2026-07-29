import { describe, expect, it } from "vitest";
import {
  economyAlerts,
  median,
  sinkForTransaction,
  sourceForTransaction,
  sparkLiabilityCents,
} from "./economy-policy.js";

describe("Spark economy policy", () => {
  it("separates creation, burns, and real-cost redemptions", () => {
    expect(sourceForTransaction("CAMPAIGN_REWARD")).toBe("PLAYTESTS");
    expect(sinkForTransaction("HYPE_PURCHASE")).toBe("HYPE");
    expect(sinkForTransaction("SPONSORED_PURCHASE")).toBe("GIFT_REWARDS");
    expect(sourceForTransaction("SPONSORED_PURCHASE_REFUND")).toBeNull();
  });

  it("uses the internal one-dollar-per-thousand planning estimate", () => {
    expect(sparkLiabilityCents(12_500)).toBe(1_250);
  });

  it("calculates median balances", () => {
    expect(median([10, 30, 20])).toBe(20);
    expect(median([10, 20])).toBe(15);
  });

  it("raises deterministic economy warnings", () => {
    const alerts = economyAlerts({
      issuedToday: 10_000,
      trailingAverageIssued: 2_000,
      redeemedToday: 0,
      trailingAverageRedeemed: 0,
      burnRate: 0.1,
      inflationToday: 9_000,
      largestManualGrant: 6_000,
      highBalanceUsers: 1,
      suspiciousUsers: 1,
      maxAdsPerUserToday: 9,
      adDailyLimit: 7,
    });
    expect(alerts.map((alert) => alert.code)).toEqual(
      expect.arrayContaining([
        "SUDDEN_INFLATION",
        "LARGE_MANUAL_GRANT",
        "REWARDED_AD_ABUSE",
        "HIGH_BALANCE",
      ]),
    );
  });
});
