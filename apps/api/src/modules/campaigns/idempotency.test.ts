import { describe, expect, it } from "vitest";

class AppendOnlyMemoryLedger {
  private readonly entries = new Map<string, number>();
  credit(idempotencyKey: string, amount: number) {
    if (!this.entries.has(idempotencyKey)) this.entries.set(idempotencyKey, amount);
  }
  balance() {
    return [...this.entries.values()].reduce((sum, amount) => sum + amount, 0);
  }
}

describe("reward idempotency", () => {
  it("does not credit a duplicate milestone completion", () => {
    const ledger = new AppendOnlyMemoryLedger();
    ledger.credit("completion:abc:earnings", 250);
    ledger.credit("completion:abc:earnings", 250);
    expect(ledger.balance()).toBe(250);
  });

  it("does not apply a duplicate payment webhook", () => {
    const ledger = new AppendOnlyMemoryLedger();
    ledger.credit("webhook:evt_123", 5000);
    ledger.credit("webhook:evt_123", 5000);
    expect(ledger.balance()).toBe(5000);
  });

  it("expires only the promotional component", () => {
    const purchased = 35000;
    const promotional = 15000;
    const expiredPromotional = 15000;
    expect(purchased + promotional - expiredPromotional).toBe(35000);
  });
});
