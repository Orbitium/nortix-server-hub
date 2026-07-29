import { describe, expect, it } from "vitest";
import { resolveRouteSeo } from "./Seo";

describe("route SEO metadata", () => {
  it("uses the Nortix Home title for both home entry routes", () => {
    expect(resolveRouteSeo("/")?.title).toBe("Nortix Home");
    expect(resolveRouteSeo("/dashboard")?.title).toBe("Nortix Home");
  });

  it("does not reuse the generic account title for authentication pages", () => {
    expect(resolveRouteSeo("/sign-in")?.title).toBe("Sign in to Nortix");
    expect(resolveRouteSeo("/register")?.title).toBe("Create a Nortix Account");
    expect(resolveRouteSeo("/owner/servers/new")?.title).toBe("Register a Minecraft Server");
  });

  it("keeps other private routes private and lets detail pages own their metadata", () => {
    expect(resolveRouteSeo("/dashboard/settings")).toMatchObject({
      title: "Nortix Account",
      noIndex: true,
    });
    expect(resolveRouteSeo("/servers/hypixel")).toBeNull();
    expect(resolveRouteSeo("/campaigns/campaign-id")).toBeNull();
  });
});
