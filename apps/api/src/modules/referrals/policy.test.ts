import { describe, expect, it } from "vitest";
import {
  referralEarningWindowEndsAt,
  referralMonthWindow,
  referralProgress,
} from "./policy.js";

describe("referral qualification policy", () => {
  it("qualifies at exactly 200 credited Sparks", () => {
    expect(referralProgress(199)).toMatchObject({ qualified: false, requiredSparks: 200 });
    expect(referralProgress(200)).toMatchObject({ qualified: true, creditedSparks: 200 });
  });

  it("never exposes negative earned progress", () => {
    expect(referralProgress(-25).creditedSparks).toBe(0);
  });

  it("uses UTC calendar months for invite limits", () => {
    expect(referralMonthWindow(new Date("2026-07-29T23:30:00-07:00"))).toEqual({
      startsAt: new Date("2026-07-01T00:00:00.000Z"),
      endsAt: new Date("2026-08-01T00:00:00.000Z"),
    });
  });

  it("ends referred-friend earning progress 30 days after claim", () => {
    expect(referralEarningWindowEndsAt(new Date("2026-07-29T12:00:00.000Z"))).toEqual(
      new Date("2026-08-28T12:00:00.000Z"),
    );
  });
});
