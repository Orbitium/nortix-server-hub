import { describe, expect, it } from "vitest";
import { testerExperienceForLevel, testerLevelForExperience } from "./progression.js";

describe("tester progression", () => {
  it("uses stable cumulative level thresholds", () => {
    expect(testerExperienceForLevel(1)).toBe(0);
    expect(testerExperienceForLevel(2)).toBe(1_000);
    expect(testerExperienceForLevel(3)).toBe(3_000);
    expect(testerExperienceForLevel(5)).toBe(10_000);
  });

  it("does not level up before a threshold", () => {
    expect(testerLevelForExperience(999)).toBe(1);
    expect(testerLevelForExperience(1_000)).toBe(2);
    expect(testerLevelForExperience(9_999)).toBe(4);
    expect(testerLevelForExperience(10_000)).toBe(5);
  });
});
