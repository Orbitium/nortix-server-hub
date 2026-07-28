import { describe, expect, it } from "vitest";
import { utcDay } from "./service.js";

describe("daily voting window", () => {
  it("uses a stable UTC boundary", () => {
    expect(utcDay(new Date("2026-07-28T23:59:59.999Z")).toISOString()).toBe(
      "2026-07-28T00:00:00.000Z",
    );
    expect(utcDay(new Date("2026-07-29T00:00:00.000Z")).toISOString()).toBe(
      "2026-07-29T00:00:00.000Z",
    );
  });
});
