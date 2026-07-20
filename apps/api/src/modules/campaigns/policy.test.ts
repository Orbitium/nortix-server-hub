import { describe, expect, it } from "vitest";
import {
  allocateCampaignCreditBudget,
  calculateCampaignCreditBalance,
  canAutomaticallyApprovePluginMilestone,
  deriveCampaignCapacity,
  evaluateCampaignEligibility,
  estimatePotentialExposure,
  suggestCampaignMilestones,
} from "./policy.js";

describe("campaign policy", () => {
  it("keeps exposure estimates broad and within capacity", () => {
    expect(estimatePotentialExposure(500, 20)).toEqual({
      minimum: 40,
      maximum: 375,
      methodology: expect.any(String),
    });
    const busy = estimatePotentialExposure(500, 1_000);
    expect(busy).toMatchObject({ minimum: 150, maximum: 500 });
  });

  it("derives capacity from Campaign Credits instead of owner Sparks", () => {
    expect(
      deriveCampaignCapacity({
        budgetCredits: 5_000,
        maximumSparksReward: 100,
        milestoneCount: 3,
      }),
    ).toEqual({ capacity: 172, costPerPotentialParticipant: 29 });
  });

  it("excludes expired Campaign Credits and allocates promotional credits first", () => {
    const balance = calculateCampaignCreditBalance(
      [
        { direction: "CREDIT", amountCents: 5_000, purchasedCents: 3_500, promotionalCents: 1_500, expiresAt: new Date("2026-08-01T00:00:00Z") },
        { direction: "CREDIT", amountCents: 500, purchasedCents: 0, promotionalCents: 500, expiresAt: new Date("2026-06-01T00:00:00Z") },
      ],
      new Date("2026-07-20T00:00:00Z"),
    );
    expect(balance).toEqual({ total: 5_000, purchased: 3_500, promotional: 1_500 });
    expect(allocateCampaignCreditBudget(balance, 2_000)).toEqual({ promotional: 1_500, purchased: 500 });
    expect(() => allocateCampaignCreditBudget(balance, 5_001)).toThrow("available Campaign Credits");
  });

  it("suggests core milestones and gates provider metrics", () => {
    const suggestions = suggestCampaignMilestones(["SKYBLOCK_LEVEL"], false);
    expect(suggestions.find((item) => item.metric === "PLAYTIME_SECONDS")?.available).toBe(true);
    expect(suggestions.find((item) => item.metric === "PLAYTIME_SECONDS")?.maximumTarget).toBe(86_400);
    expect(suggestions.find((item) => item.metric === "SKYBLOCK_LEVEL")?.available).toBe(true);
    expect(suggestions.find((item) => item.metric === "LIFESTEAL_HEARTS")?.available).toBe(false);
  });

  it("auto-approves only backend-aggregated plugin milestones with plausible timing", () => {
    const base = {
      verificationMethod: "SERVER_PLUGIN",
      reviewRequired: false,
      metric: "UNIQUE_PLAYER_KILLS",
      target: 10,
      observed: 10,
      eventCount: 10,
      firstObservedAt: new Date("2026-07-20T10:00:00.000Z"),
      lastObservedAt: new Date("2026-07-20T10:00:05.000Z"),
    };
    expect(canAutomaticallyApprovePluginMilestone(base)).toBe(true);
    expect(
      canAutomaticallyApprovePluginMilestone({
        ...base,
        lastObservedAt: new Date("2026-07-20T10:00:00.100Z"),
      }),
    ).toBe(false);
    expect(canAutomaticallyApprovePluginMilestone({ ...base, reviewRequired: true })).toBe(false);
  });

  it("requires a fresh seven-day activity history averaging at least ten players", () => {
    const now = new Date("2026-07-21T12:00:00.000Z");
    const eligibleSamples = Array.from({ length: 12 }, (_, index) => ({
      onlinePlayers: index % 2 ? 11 : 13,
      observedAt: new Date(now.getTime() - index * 60_000),
    }));
    expect(evaluateCampaignEligibility(eligibleSamples, now)).toMatchObject({
      eligible: true,
      averagePlayers: 12,
      sampleCount: 12,
      reason: "ELIGIBLE",
    });
    expect(
      evaluateCampaignEligibility(
        eligibleSamples.map((sample) => ({ ...sample, onlinePlayers: 9 })),
        now,
      ),
    ).toMatchObject({ eligible: false, reason: "BELOW_MINIMUM_AVERAGE" });
    expect(evaluateCampaignEligibility(eligibleSamples.slice(0, 3), now)).toMatchObject({
      eligible: false,
      reason: "INSUFFICIENT_ACTIVITY_HISTORY",
    });
  });
});
