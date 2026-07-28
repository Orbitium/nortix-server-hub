import { describe, expect, it } from "vitest";
import { referralProgress } from "./policy.js";

describe("referral qualification policy", () => {
  it("qualifies at exactly 200 credited Sparks", () => {
    expect(referralProgress(199)).toMatchObject({ qualified: false, requiredSparks: 200 });
    expect(referralProgress(200)).toMatchObject({ qualified: true, creditedSparks: 200 });
  });

  it("never exposes negative earned progress", () => {
    expect(referralProgress(-25).creditedSparks).toBe(0);
  });
});
