import { describe, expect, it } from "vitest";
import { absoluteCampaignShareUrl, campaignLandingPath, campaignSocialLinks } from "./campaign-sharing";

const campaign = {
  id: "campaign 1",
  title: "First island test",
  maximumSparksReward: 100,
  server: { id: "server-1", slug: "skyblock-x", name: "Skyblock X" },
};

describe("campaign sharing", () => {
  it("builds a crawler-friendly share URL and a server-page landing URL", () => {
    expect(absoluteCampaignShareUrl(campaign.id, "https://hub.nortixlabs.com")).toBe(
      "https://hub.nortixlabs.com/share/campaigns/campaign%201",
    );
    expect(campaignLandingPath(campaign)).toBe(
      "/servers/skyblock-x?campaign=campaign%201",
    );
  });

  it("encodes social share parameters", () => {
    const links = campaignSocialLinks(campaign, "https://hub.nortixlabs.com");
    expect(links.x).toContain("x.com/intent/post");
    expect(decodeURIComponent(links.whatsapp)).toContain("up to 100 Sparks");
  });
});
