import { describe, expect, it } from "vitest";
import { adjustedSparksBalance, sparksBalances } from "./policy.js";

describe("admin Sparks policy", () => {
  it("calculates balances from the append-only ledger", () => {
    const balances = sparksBalances([
      { userId: "player-a", direction: "CREDIT", _sum: { amount: 120 } },
      { userId: "player-a", direction: "DEBIT", _sum: { amount: 45 } },
      { userId: "player-b", direction: "CREDIT", _sum: { amount: 20 } },
    ]);

    expect(balances.get("player-a")).toBe(75);
    expect(balances.get("player-b")).toBe(20);
  });

  it("rejects debits that would create a negative balance", () => {
    expect(() => adjustedSparksBalance(25, "DEBIT", 26)).toThrow(/negative/i);
    expect(adjustedSparksBalance(25, "DEBIT", 25)).toBe(0);
    expect(adjustedSparksBalance(25, "CREDIT", 10)).toBe(35);
  });
});
