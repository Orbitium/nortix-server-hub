import { describe, expect, it } from "vitest";
import {
  assertNoSparksToEarningsConversion,
  assertSparksPurchase,
  assertWithdrawalTransition,
  calculateMoneyBalance,
  calculateSparksBalance,
} from "./ledger.js";

describe("ledger invariants", () => {
  it("calculates append-only earnings balances", () => {
    expect(
      calculateMoneyBalance([
        { direction: "CREDIT", amountCents: 5000 },
        { direction: "DEBIT", amountCents: 1200 },
        { direction: "CREDIT", amountCents: 250 },
      ]),
    ).toBe(4050);
  });

  it("reserves and cancels withdrawals with explicit entries", () => {
    expect(
      calculateMoneyBalance([
        { direction: "CREDIT", amountCents: 5000 },
        { direction: "DEBIT", amountCents: 2000 },
      ]),
    ).toBe(3000);
    expect(
      calculateMoneyBalance([
        { direction: "CREDIT", amountCents: 5000 },
        { direction: "DEBIT", amountCents: 2000 },
        { direction: "CREDIT", amountCents: 2000 },
      ]),
    ).toBe(5000);
    expect(() => assertWithdrawalTransition("REQUESTED", "UNDER_REVIEW")).not.toThrow();
    expect(() => assertWithdrawalTransition("UNDER_REVIEW", "CANCELLED")).not.toThrow();
  });

  it("rejects invalid withdrawal state transitions", () => {
    expect(() => assertWithdrawalTransition("PAID", "CANCELLED")).toThrow();
    expect(() => assertWithdrawalTransition("REQUESTED", "PAID")).toThrow();
  });

  it("enforces Sparks purchases and balance calculation", () => {
    expect(
      calculateSparksBalance([
        { direction: "CREDIT", amount: 5000 },
        { direction: "DEBIT", amount: 2200 },
      ]),
    ).toBe(2800);
    expect(() => assertSparksPurchase(2800, 2200)).not.toThrow();
    expect(() => assertSparksPurchase(100, 2200)).toThrow();
  });

  it("forbids Sparks-to-earnings conversion", () => {
    expect(() => assertNoSparksToEarningsConversion(1000, 100)).toThrow(/cannot be converted/i);
  });
});
