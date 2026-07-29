import { describe, expect, it } from "vitest";
import { buildCampaignShareHtml } from "./html.js";

describe("buildCampaignShareHtml", () => {
  it("creates campaign-specific social metadata and a server landing redirect", () => {
    const html = buildCampaignShareHtml({
      title: "Test <Island>",
      description: "Try the tutorial & report issues.",
      serverName: "Skyblock X",
      shareUrl: "https://hub.nortixlabs.com/share/campaigns/1",
      targetUrl: "https://hub.nortixlabs.com/servers/skyblock-x?campaign=1",
      imageUrl: "https://cdn.example/banner.png",
    });
    expect(html).toContain("og:title");
    expect(html).toContain("Test &lt;Island&gt;");
    expect(html).toContain("/servers/skyblock-x?campaign=1");
    expect(html).not.toContain("Test <Island>");
  });
});
