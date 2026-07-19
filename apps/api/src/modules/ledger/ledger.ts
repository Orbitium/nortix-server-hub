import type { LedgerDirection, WithdrawalStatus } from "@nortix/database";

export type MoneyLedgerLike = {
  direction: LedgerDirection | "CREDIT" | "DEBIT";
  amountCents: number;
};

export type SparksLedgerLike = {
  direction: LedgerDirection | "CREDIT" | "DEBIT";
  amount: number;
};

export const calculateMoneyBalance = (entries: readonly MoneyLedgerLike[]) =>
  entries.reduce(
    (balance, entry) =>
      balance + (entry.direction === "CREDIT" ? entry.amountCents : -entry.amountCents),
    0,
  );

export const calculateSparksBalance = (entries: readonly SparksLedgerLike[]) =>
  entries.reduce(
    (balance, entry) => balance + (entry.direction === "CREDIT" ? entry.amount : -entry.amount),
    0,
  );

const allowedWithdrawalTransitions: Record<WithdrawalStatus | string, readonly string[]> = {
  REQUESTED: ["UNDER_REVIEW", "CANCELLED"],
  UNDER_REVIEW: ["APPROVED", "REJECTED", "CANCELLED"],
  APPROVED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["PAID", "FAILED"],
  PAID: [],
  REJECTED: [],
  CANCELLED: [],
  FAILED: ["UNDER_REVIEW", "CANCELLED"],
};

export const assertWithdrawalTransition = (
  from: WithdrawalStatus | string,
  to: WithdrawalStatus | string,
) => {
  if (!allowedWithdrawalTransitions[from]?.includes(to)) {
    throw new Error(`Withdrawal cannot transition from ${from} to ${to}.`);
  }
};

export const assertSparksPurchase = (balance: number, price: number) => {
  if (!Number.isInteger(price) || price <= 0)
    throw new Error("Sparks price must be a positive integer.");
  if (balance < price) throw new Error("Not enough Sparks for this cosmetic.");
};

export const assertNoSparksToEarningsConversion = (
  _sparks: number,
  _earningsCents: number,
): never => {
  throw new Error("Sparks cannot be converted into withdrawable earnings.");
};
