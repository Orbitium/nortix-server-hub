export const sparksPurchaseTotal = (unitPrice: number, quantity: number) =>
  Math.max(0, Math.trunc(unitPrice)) * Math.max(1, Math.trunc(quantity));

export const isInsufficientSparksError = (error: unknown) =>
  error instanceof Error && error.message.toLowerCase().includes("not enough sparks");
