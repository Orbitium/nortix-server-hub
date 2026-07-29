import { describe, expect, it } from "vitest";
import { canTransitionSponsoredPurchase, sponsoredPurchaseStatusAfter } from "./policy.js";

describe("sponsored purchase lifecycle", () => {
  it("allows delivery only before a terminal status", () => {
    expect(canTransitionSponsoredPurchase("REQUESTED", "MARK_DELIVERED")).toBe(true);
    expect(canTransitionSponsoredPurchase("PROCESSING", "MARK_DELIVERED")).toBe(true);
    expect(canTransitionSponsoredPurchase("CANCELLED", "MARK_DELIVERED")).toBe(false);
    expect(canTransitionSponsoredPurchase("REFUNDED", "MARK_DELIVERED")).toBe(false);
  });

  it("allows a refund after delivery or cancellation but never twice", () => {
    expect(canTransitionSponsoredPurchase("DELIVERED", "REFUND")).toBe(true);
    expect(canTransitionSponsoredPurchase("CANCELLED", "REFUND")).toBe(true);
    expect(canTransitionSponsoredPurchase("REFUNDED", "REFUND")).toBe(false);
    expect(sponsoredPurchaseStatusAfter("CANCEL_AND_REFUND")).toBe("REFUNDED");
  });
});
