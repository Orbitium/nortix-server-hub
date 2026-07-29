import { describe, expect, it } from "vitest";
import {
  AdminCampaignTerminationInputSchema,
  AdminSponsoredCampaignInputSchema,
  CampaignInputSchema,
} from "./index.js";

const campaign = {
  serverId: "server-1",
  title: "First island flow",
  description: "Find where first-time players pause during the guided island setup.",
  category: "Onboarding",
  startsAt: "2026-07-20T10:00:00.000Z",
  endsAt: "2026-08-20T10:00:00.000Z",
  budgetCredits: 5_000,
  sparksRewardRange: { minimum: 50, maximum: 100 },
  regionRestrictions: [],
  versionRequirements: ["1.21"],
  milestones: [
    {
      templateType: "PLAYTIME_SECONDS",
      title: "Stay active",
      instructions: "Stay active while Nortix checks safeguarded server events.",
      verificationMethod: "SERVER_PLUGIN",
      config: { metric: "PLAYTIME_SECONDS", target: 1_800, scope: "SERVER" },
    },
  ],
};

describe("campaign input", () => {
  it("accepts compact automatic campaigns with a Sparks range", () => {
    expect(CampaignInputSchema.parse(campaign).sparksRewardRange).toEqual({
      minimum: 50,
      maximum: 100,
    });
  });

  it("rejects oversized player-facing copy", () => {
    expect(CampaignInputSchema.safeParse({ ...campaign, title: "x".repeat(65) }).success).toBe(
      false,
    );
    expect(
      CampaignInputSchema.safeParse({ ...campaign, description: "x".repeat(321) }).success,
    ).toBe(false);
  });

  it("rejects campaigns dominated by manual confirmation", () => {
    const manual = {
      ...campaign.milestones[0],
      templateType: "CUSTOM_MANUAL",
      verificationMethod: "MANUAL",
    };
    expect(
      CampaignInputSchema.safeParse({
        ...campaign,
        milestones: [campaign.milestones[0], manual],
      }).success,
    ).toBe(false);
  });

  it("requires enough Campaign Credits for a minimum viable exposure", () => {
    expect(CampaignInputSchema.safeParse({ ...campaign, budgetCredits: 100 }).success).toBe(false);
    expect(CampaignInputSchema.safeParse({ ...campaign, budgetCredits: 5_000 }).success).toBe(true);
  });

  it("requires an explicit target for Nortix-sponsored campaigns", () => {
    const { serverId, ...configuration } = campaign;
    expect(AdminSponsoredCampaignInputSchema.safeParse(configuration).success).toBe(false);
    expect(
      AdminSponsoredCampaignInputSchema.safeParse({
        ...configuration,
        target: { serverId },
      }).success,
    ).toBe(true);
    expect(
      AdminSponsoredCampaignInputSchema.safeParse({
        ...configuration,
        target: {
          address: { hostname: "play.example.net", port: 25565, edition: "JAVA" },
        },
      }).success,
    ).toBe(true);
    expect(
      AdminSponsoredCampaignInputSchema.safeParse({
        ...configuration,
        target: {
          serverId,
          address: { hostname: "play.example.net", port: 25565, edition: "JAVA" },
        },
      }).success,
    ).toBe(true);
  });

  it("validates typed campaign termination choices", () => {
    expect(
      AdminCampaignTerminationInputSchema.safeParse({
        refundPolicy: "REFUND_UNUSED",
        reason: "",
        confirmation: "campaign-1",
      }).success,
    ).toBe(true);
    expect(
      AdminCampaignTerminationInputSchema.safeParse({
        refundPolicy: "SOMETHING_ELSE",
        confirmation: "campaign-1",
      }).success,
    ).toBe(false);
  });
});
