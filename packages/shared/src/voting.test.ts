import { describe, expect, it } from "vitest";
import {
  RewardedVoteSessionGrantSchema,
  RewardedVoteSessionInputSchema,
  ServerRewardedVotingSettingSchema,
  ServerVoteInputSchema,
} from "./index.js";

describe("server vote contracts", () => {
  it("requires a bounded Turnstile token", () => {
    expect(
      ServerVoteInputSchema.parse({ vote: true, turnstileToken: "verified-token" }),
    ).toEqual({ vote: true, turnstileToken: "verified-token" });
    expect(() => ServerVoteInputSchema.parse({ vote: true })).toThrow();
    expect(() =>
      ServerVoteInputSchema.parse({
        vote: true,
        turnstileToken: "token",
        playerId: "another-user",
      }),
    ).toThrow();
  });
});

describe("rewarded voting contracts", () => {
  it("requires a Turnstile proof before starting an ad session", () => {
    expect(
      RewardedVoteSessionInputSchema.safeParse({ turnstileToken: "turnstile-proof" }).success,
    ).toBe(true);
    expect(RewardedVoteSessionInputSchema.safeParse({}).success).toBe(false);
  });

  it("accepts only a bounded server-issued redemption token", () => {
    expect(RewardedVoteSessionGrantSchema.safeParse({ token: "x".repeat(32) }).success).toBe(true);
    expect(RewardedVoteSessionGrantSchema.safeParse({ token: "short" }).success).toBe(false);
  });

  it("keeps the owner setting explicit and strict", () => {
    expect(
      ServerRewardedVotingSettingSchema.safeParse({ rewardedVotingEnabled: false }).success,
    ).toBe(true);
    expect(
      ServerRewardedVotingSettingSchema.safeParse({
        rewardedVotingEnabled: true,
        serverId: "browser-supplied",
      }).success,
    ).toBe(false);
  });
});
