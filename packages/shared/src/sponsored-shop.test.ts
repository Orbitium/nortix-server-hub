import { describe, expect, it } from "vitest";
import {
  AdminSponsoredPurchaseActionSchema,
  AdminSponsoredStoreInputSchema,
  SponsoredPurchaseInputSchema,
  rolePermissions,
} from "./index.js";

describe("sponsored Sparks shop contracts", () => {
  it("keeps sponsored operations admin-only", () => {
    expect(rolePermissions.ADMIN).toContain("sponsored_shop:manage");
    expect(rolePermissions.ADMIN).toContain("sponsored_purchase:fulfill");
    expect(rolePermissions.MODERATOR).not.toContain("sponsored_shop:manage");
    expect(rolePermissions.PLAYER).not.toContain("sponsored_purchase:fulfill");
  });

  it("rejects misleading or malformed store input", () => {
    expect(
      AdminSponsoredStoreInputSchema.safeParse({
        slug: "discord",
        name: "Discord",
        description: "Independent gifts supplied by Nortix Labs.",
      }).success,
    ).toBe(true);
    expect(
      AdminSponsoredStoreInputSchema.safeParse({
        slug: "Discord Official Partner",
        name: "Discord",
        description: "Too short",
      }).success,
    ).toBe(false);
  });

  it("does not accept browser-selected price, user, or status fields", () => {
    expect(
      SponsoredPurchaseInputSchema.safeParse({
        itemId: "item_1",
        idempotencyKey: crypto.randomUUID(),
        fulfillmentDetails: {},
        priceSparks: 1,
        userId: "another-user",
        status: "DELIVERED",
      }).success,
    ).toBe(false);
  });

  it("accepts bounded quantities and defaults legacy requests to one", () => {
    const base = {
      itemId: "item_1",
      idempotencyKey: crypto.randomUUID(),
      fulfillmentDetails: {},
    };
    expect(SponsoredPurchaseInputSchema.parse(base).quantity).toBe(1);
    expect(SponsoredPurchaseInputSchema.safeParse({ ...base, quantity: 10 }).success).toBe(true);
    expect(SponsoredPurchaseInputSchema.safeParse({ ...base, quantity: 0 }).success).toBe(false);
    expect(SponsoredPurchaseInputSchema.safeParse({ ...base, quantity: 11 }).success).toBe(false);
  });

  it("requires confirmation and reasons for refunds", () => {
    expect(
      AdminSponsoredPurchaseActionSchema.safeParse({
        action: "REFUND",
        reason: "Gift could not be supplied.",
        confirmation: "CONFIRM",
      }).success,
    ).toBe(true);
    expect(
      AdminSponsoredPurchaseActionSchema.safeParse({
        action: "REFUND",
        confirmation: "CONFIRM",
      }).success,
    ).toBe(false);
  });
});
