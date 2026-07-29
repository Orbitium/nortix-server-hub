import { describe, expect, it } from "vitest";
import { calculateActivityStreak, utcActivityDay, type DailyActivity } from "./policy.js";

const day = (
  isoDate: string,
  activity: Partial<Omit<DailyActivity, "activityDate">> = { webOpened: true },
): DailyActivity => ({
  activityDate: new Date(`${isoDate}T00:00:00.000Z`),
  webOpened: false,
  campaignPlayed: false,
  verifiedServerJoined: false,
  ...activity,
});

describe("activity streak policy", () => {
  it("normalizes activity to stable UTC day boundaries", () => {
    expect(utcActivityDay(new Date("2026-07-29T23:59:59.999Z")).toISOString()).toBe(
      "2026-07-29T00:00:00.000Z",
    );
  });

  it("counts web, campaign, and verified-server activity on consecutive days", () => {
    const streak = calculateActivityStreak(
      [
        day("2026-07-27"),
        day("2026-07-28", { campaignPlayed: true }),
        day("2026-07-29", { verifiedServerJoined: true }),
      ],
      new Date("2026-07-29T18:00:00.000Z"),
    );

    expect(streak.current).toBe(3);
    expect(streak.longest).toBe(3);
    expect(streak.today.verifiedServerJoined).toBe(true);
    expect(streak.days.at(-1)?.active).toBe(true);
  });

  it("keeps yesterday's current streak available until the current UTC day ends", () => {
    const streak = calculateActivityStreak(
      [day("2026-07-26"), day("2026-07-27"), day("2026-07-28")],
      new Date("2026-07-29T08:00:00.000Z"),
    );

    expect(streak.current).toBe(3);
    expect(streak.today.active).toBe(false);
  });

  it("resets current after a missed full day while retaining the all-time best", () => {
    const streak = calculateActivityStreak(
      [
        day("2025-01-01"),
        day("2025-01-02"),
        day("2025-01-03"),
        day("2026-07-27"),
      ],
      new Date("2026-07-29T08:00:00.000Z"),
    );

    expect(streak.current).toBe(0);
    expect(streak.longest).toBe(3);
  });

  it("does not count duplicate or empty daily records twice", () => {
    const streak = calculateActivityStreak(
      [
        day("2026-07-28"),
        day("2026-07-28", { campaignPlayed: true }),
        day("2026-07-29", {}),
      ],
      new Date("2026-07-29T08:00:00.000Z"),
    );

    expect(streak.current).toBe(1);
    expect(streak.longest).toBe(1);
    expect(streak.today.active).toBe(false);
  });
});
