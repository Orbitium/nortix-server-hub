import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { MockPaymentProvider } from "./index.js";

describe("MockPaymentProvider", () => {
  it("rejects invalid webhook signatures and accepts a valid one", async () => {
    const provider = new MockPaymentProvider("secret");
    const event = {
      id: "evt_1",
      type: "PAYMENT_SUCCEEDED" as const,
      referenceId: "purchase_1",
      amountCents: 5000,
      currency: "USD",
    };
    await expect(provider.verifyWebhook(event, "bad")).rejects.toThrow();
    const signature = createHmac("sha256", "secret").update(JSON.stringify(event)).digest("hex");
    await expect(provider.verifyWebhook(event, signature)).resolves.toEqual(event);
  });
});
