import { describe, expect, it } from "vitest";
import {
  CosmeticTypeSchema,
  EquipCosmeticInputSchema,
  UnequipCosmeticInputSchema,
} from "./index.js";

describe("cosmetic contracts", () => {
  it("accepts only durable cosmetic slots", () => {
    expect(CosmeticTypeSchema.parse("BANNER")).toBe("BANNER");
    expect(() => CosmeticTypeSchema.parse("PROFILE_BACKGROUND")).toThrow();
  });

  it("keeps equip and unequip payloads strict", () => {
    expect(EquipCosmeticInputSchema.parse({ itemId: "cosmetic_1" })).toEqual({
      itemId: "cosmetic_1",
    });
    expect(() =>
      UnequipCosmeticInputSchema.parse({ type: "BADGE", userId: "another-user" }),
    ).toThrow();
  });
});
