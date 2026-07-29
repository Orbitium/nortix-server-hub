import { describe, expect, it } from "vitest";
import {
  discoveryScore,
  effectiveHypeScore,
  hypeMilestoneFor,
  nextHypeMilestoneFor,
} from "./policy.js";

describe("Hype policy", () => {
  it("carries twenty percent at each UTC month boundary", () => {
    expect(
      effectiveHypeScore(12_450, new Date("2026-07-01T00:00:00Z"), new Date("2026-08-01T00:00:00Z")),
    ).toBe(2_490);
    expect(
      effectiveHypeScore(12_450, new Date("2026-07-01T00:00:00Z"), new Date("2026-09-01T00:00:00Z")),
    ).toBe(498);
  });

  it("selects the current and next cosmetic milestones", () => {
    expect(hypeMilestoneFor(500)?.name).toBe("Gold");
    expect(nextHypeMilestoneFor(500)?.name).toBe("Platinum");
  });

  it("keeps Hype as a bounded minority of discovery scoring", () => {
    const onlyHype = discoveryScore({
      hype: 100_000,
      online: false,
      playerCount: 0,
      rating: null,
      reviewCount: 0,
      monthlyVotes: 0,
      activeCampaigns: 0,
      completionRate: null,
      retentionRate: null,
      recentlyActive: false,
    });
    const healthyServer = discoveryScore({
      hype: 0,
      online: true,
      playerCount: 100,
      rating: 4.8,
      reviewCount: 20,
      monthlyVotes: 80,
      activeCampaigns: 2,
      completionRate: 0.8,
      retentionRate: 0.5,
      recentlyActive: true,
    });
    expect(onlyHype).toBeLessThan(healthyServer);
    expect(onlyHype).toBeLessThanOrEqual(18);
  });
});
