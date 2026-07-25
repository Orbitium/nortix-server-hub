import { describe, expect, it } from "vitest";
import { isCosmeticUnlocked, normalizeCosmeticPreview } from "./policy.js";

describe("cosmetic policy", () => {
  it("unlocks defaults and reached level rewards without a purchase", () => {
    expect(
      isCosmeticUnlocked({
        unlockMethod: "DEFAULT",
        requiredLevel: null,
        testerLevel: 1,
        purchased: false,
      }),
    ).toBe(true);
    expect(
      isCosmeticUnlocked({
        unlockMethod: "LEVEL",
        requiredLevel: 5,
        testerLevel: 5,
        purchased: false,
      }),
    ).toBe(true);
  });

  it("requires durable ownership for Sparks cosmetics", () => {
    expect(
      isCosmeticUnlocked({
        unlockMethod: "SPARKS",
        requiredLevel: null,
        testerLevel: 99,
        purchased: false,
      }),
    ).toBe(false);
  });

  it("does not pass arbitrary CSS through preview metadata", () => {
    expect(
      normalizeCosmeticPreview({
        primary: "url(https://example.invalid)",
        accent: "#AABBCC",
        icon: "<svg>",
        pattern: "external",
      }),
    ).toEqual({
      primary: "#26364a",
      accent: "#AABBCC",
      icon: "sparkles",
      pattern: "plain",
    });
  });
});
