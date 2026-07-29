type BalanceRow = {
  userId: string;
  direction: "CREDIT" | "DEBIT";
  _sum: { amount: number | null };
};

export const sparksBalances = (rows: readonly BalanceRow[]) => {
  const balances = new Map<string, number>();
  for (const row of rows) {
    const signedAmount =
      row.direction === "CREDIT" ? (row._sum.amount ?? 0) : -(row._sum.amount ?? 0);
    balances.set(row.userId, (balances.get(row.userId) ?? 0) + signedAmount);
  }
  return balances;
};

export const adjustedSparksBalance = (
  currentBalance: number,
  direction: "CREDIT" | "DEBIT",
  amount: number,
) => {
  const nextBalance = currentBalance + (direction === "CREDIT" ? amount : -amount);
  if (nextBalance < 0) {
    throw new Error("A Sparks adjustment cannot make a player's balance negative.");
  }
  return nextBalance;
};
