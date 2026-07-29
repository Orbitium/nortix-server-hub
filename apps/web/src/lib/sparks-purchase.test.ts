import { describe, expect, it } from "vitest";
import { isInsufficientSparksError, sparksPurchaseTotal } from "./sparks-purchase";

describe("Sparks purchase UI policy", () => {
  it("calculates a quantity total from whole, positive values", () => {
    expect(sparksPurchaseTotal(1_250, 3)).toBe(3_750);
    expect(sparksPurchaseTotal(1_250, 0)).toBe(1_250);
  });

  it("recognizes the backend insufficient-balance response", () => {
    expect(isInsufficientSparksError(new Error("Not enough Sparks."))).toBe(true);
    expect(isInsufficientSparksError(new Error("Item unavailable."))).toBe(false);
  });
});
