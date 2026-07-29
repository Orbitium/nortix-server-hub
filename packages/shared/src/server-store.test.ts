import { describe, expect, it } from "vitest";
import {
  OwnerServerStoreItemInputSchema,
  ServerStorePurchaseInputSchema,
} from "./index.js";

const item = {
  slug: "vip-rank",
  name: "VIP rank",
  description: "A permanent VIP rank delivered on the selected server.",
  sparksPrice: 500,
  imageUrls: ["https://cdn.example.com/vip.png"],
  stockQuantity: 20,
  maxPerPurchase: 2,
  commandTemplates: [
    "lp user %player% parent add vip",
    "give %player% diamond %amount%",
  ],
  available: true,
  sortOrder: 0,
};

describe("server store contracts", () => {
  it("accepts allowlisted fulfillment placeholders", () => {
    expect(OwnerServerStoreItemInputSchema.safeParse(item).success).toBe(true);
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
});
