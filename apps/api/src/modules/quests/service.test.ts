import { describe, expect, it } from "vitest";
import { questDateForCadence } from "./service.js";

describe("quest recurrence dates", () => {
  it("places daily quests in the current UTC day and one-time quests in the permanent bucket", () => {
    const now = new Date("2026-07-28T21:45:12.000Z");
    expect(questDateForCadence("DAILY", now).toISOString()).toBe("2026-07-28T00:00:00.000Z");
    expect(questDateForCadence("ONCE", now).toISOString()).toBe("1970-01-01T00:00:00.000Z");
  });
});
