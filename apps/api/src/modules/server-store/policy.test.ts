import { describe, expect, it } from "vitest";
import {
  calculateOwnerProceedsCents,
  calculateStoreProceedsBalance,
  canPublishServerStore,
  canRefundServerStorePurchase,
  renderServerStoreCommands,
} from "./policy.js";

describe("server store command rendering", () => {
  it("renders only server-approved values into the command snapshot", () => {
    expect(
      renderServerStoreCommands(
        ["give %PLAYER% diamond %amount%", "say %recipient% received %item_id%"],
        {
          player: "Steve",
          quantity: 3,
          purchaseId: "purchase-1",
          itemId: "diamonds",
          buyer: "buyer",
          recipient: "friend",
        },
      ),
    ).toEqual(["give Steve diamond 3", "say friend received diamonds"]);
  });
});

describe("server store sale policy", () => {
  it("allows private drafts but requires a verified public server and recent signed plugin to publish", () => {
    const now = new Date("2026-07-29T12:00:00.000Z");
    const eligibleServer = {
      claimed: true,
      verificationStatus: "VERIFIED",
      publicListing: true,
      pluginLastSeenAt: new Date("2026-07-29T11:55:00.000Z"),
      pluginCapabilities: ["store:delivery"],
      hasActiveSigningKey: true,
    };

    expect(canPublishServerStore(eligibleServer, now)).toBe(true);
    expect(canPublishServerStore({ ...eligibleServer, claimed: false }, now)).toBe(false);
    expect(
      canPublishServerStore({ ...eligibleServer, verificationStatus: "UNVERIFIED" }, now),
    ).toBe(false);
    expect(canPublishServerStore({ ...eligibleServer, publicListing: false }, now)).toBe(false);
    expect(
      canPublishServerStore(
        { ...eligibleServer, pluginLastSeenAt: new Date("2026-07-29T11:49:59.000Z") },
        now,
      ),
    ).toBe(false);
    expect(canPublishServerStore({ ...eligibleServer, pluginCapabilities: [] }, now)).toBe(false);
    expect(canPublishServerStore({ ...eligibleServer, hasActiveSigningKey: false }, now)).toBe(
      false,
    );
  });

  it("allows only an unredeemed self-purchase inside the 14-day window", () => {
    const purchase = {
      buyerId: "buyer",
      recipientId: "buyer",
      status: "PURCHASED",
      refundEligibleUntil: new Date("2026-08-12T00:00:00.000Z"),
    };
    expect(
      canRefundServerStorePurchase(purchase, "buyer", new Date("2026-08-11T00:00:00.000Z")),
    ).toBe(true);
    expect(
      canRefundServerStorePurchase(
        { ...purchase, recipientId: "gift-recipient" },
        "buyer",
        new Date("2026-08-11T00:00:00.000Z"),
      ),
    ).toBe(false);
    expect(
      canRefundServerStorePurchase(
        { ...purchase, status: "PENDING_DELIVERY" },
        "buyer",
        new Date("2026-08-11T00:00:00.000Z"),
      ),
    ).toBe(false);
  });

  it("keeps held proceeds out of the available amount", () => {
    const now = new Date("2026-08-10T00:00:00.000Z");
    expect(
      calculateStoreProceedsBalance(
        [
          { direction: "CREDIT", amountCents: 2_000, availableAt: now },
          {
            direction: "CREDIT",
            amountCents: 1_000,
            availableAt: new Date("2026-08-11T00:00:00.000Z"),
          },
          { direction: "DEBIT", amountCents: 500, availableAt: now },
        ],
        now,
      ),
    ).toBe(1_500);
    expect(calculateOwnerProceedsCents(2_500, 20)).toBe(50);
  });
});
