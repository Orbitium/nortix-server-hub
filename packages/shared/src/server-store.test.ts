import { describe, expect, it } from "vitest";
import {
  AdminServerStorePayoutActionSchema,
  OwnerServerStorePayoutInputSchema,
  OwnerServerStoreItemInputSchema,
  OwnerServerStoreItemUpdateSchema,
  ServerStorePurchaseInputSchema,
} from "./index.js";

const item = {
  slug: "vip-rank",
  name: "VIP rank",
  description: "A permanent VIP rank delivered on the selected server.",
  category: "RANKS",
  sparksPrice: 500,
  imageUrls: ["https://cdn.example.com/vip.png"],
  stockQuantity: 20,
  maxPerPurchase: 2,
  commandTemplates: [
    "lp user %player% parent add vip",
    "give %player% diamond %amount%",
  ],
  status: "PUBLISHED",
  sortOrder: 0,
};

describe("server store contracts", () => {
  it("accepts allowlisted fulfillment placeholders", () => {
    expect(OwnerServerStoreItemInputSchema.safeParse(item).success).toBe(true);
  });

  it("defaults uncategorized items to Other and rejects arbitrary categories", () => {
    const { category: _category, ...uncategorized } = item;
    expect(OwnerServerStoreItemInputSchema.parse(uncategorized).category).toBe("OTHER");
    expect(
      OwnerServerStoreItemInputSchema.safeParse({ ...item, category: "MONEY" }).success,
    ).toBe(false);
    expect(OwnerServerStoreItemUpdateSchema.parse({ category: "COINS" })).toEqual({
      category: "COINS",
    });
  });

  it("rejects unknown placeholders and multiline commands", () => {
    expect(
      OwnerServerStoreItemInputSchema.safeParse({
        ...item,
        commandTemplates: ["op %player%\nsay unsafe"],
      }).success,
    ).toBe(false);
    expect(
      OwnerServerStoreItemInputSchema.safeParse({
        ...item,
        commandTemplates: ["give %uuid% diamond 1"],
      }).success,
    ).toBe(false);
  });

  it("requires encrypted image URLs", () => {
    expect(
      OwnerServerStoreItemInputSchema.safeParse({
        ...item,
        imageUrls: ["http://cdn.example.com/vip.png"],
      }).success,
    ).toBe(false);
  });

  it("accepts an uploaded Nortix store image and explicit draft states", () => {
    expect(
      OwnerServerStoreItemInputSchema.safeParse({
        ...item,
        status: "DRAFT",
        imageUrls: ["/api/v1/media/store-items/123e4567-e89b-42d3-a456-426614174000.webp"],
      }).success,
    ).toBe(true);
    expect(
      OwnerServerStoreItemInputSchema.safeParse({ ...item, status: "HIDDEN" }).success,
    ).toBe(false);
  });

  it("accepts a gift addressed to a Nortix username", () => {
    expect(
      ServerStorePurchaseInputSchema.safeParse({
        itemId: "item-1",
        idempotencyKey: "123e4567-e89b-42d3-a456-426614174000",
        quantity: 1,
        recipientUsername: "friend_1",
        giftMessage: "Enjoy!",
      }).success,
    ).toBe(true);
  });

  it("validates proceeds requests and requires confirmation for a paid action", () => {
    expect(
      OwnerServerStorePayoutInputSchema.safeParse({
        amountCents: 1_000,
        idempotencyKey: "123e4567-e89b-42d3-a456-426614174000",
      }).success,
    ).toBe(true);
    expect(
      AdminServerStorePayoutActionSchema.safeParse({
        action: "MARK_PAID",
        reason: "Provider completed the reviewed request.",
      }).success,
    ).toBe(false);
  });
});
