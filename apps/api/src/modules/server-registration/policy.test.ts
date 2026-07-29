import { describe, expect, it } from "vitest";
import { canDeleteServerRegistration, normalizeServerHostname } from "./policy.js";

describe("server registration policy", () => {
  it("normalizes equivalent hostname spellings for endpoint uniqueness", () => {
    expect(normalizeServerHostname(" Play.Example.NET. ")).toBe("play.example.net");
  });

  it("allows deletion only for direct, unclaimed registrations", () => {
    expect(
      canDeleteServerRegistration({
        claimed: false,
        verificationStatus: "PENDING",
        verificationScope: "SERVER",
      }),
    ).toBe(true);
    expect(
      canDeleteServerRegistration({
        claimed: true,
        verificationStatus: "VERIFIED",
        verificationScope: "SERVER",
      }),
    ).toBe(false);
    expect(
      canDeleteServerRegistration({
        claimed: true,
        verificationStatus: "VERIFIED",
        verificationScope: "PROXY_CHILD",
      }),
    ).toBe(false);
  });
});
