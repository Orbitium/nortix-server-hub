import { describe, expect, it } from "vitest";
import { gameplayDeltaForEvent } from "./service.js";

describe("player gameplay rollups", () => {
  it("maps bounded plugin events to friendly counters", () => {
    expect(gameplayDeltaForEvent("PLAYER_JOIN", {})).toMatchObject({ joins: 1 });
    expect(gameplayDeltaForEvent("PLAYTIME", { seconds: 60 })).toMatchObject({
      playtimeSeconds: 60,
    });
    expect(gameplayDeltaForEvent("PLAYER_KILL", {})).toMatchObject({ playerKills: 1 });
    expect(gameplayDeltaForEvent("MOB_KILL", {})).toMatchObject({ mobKills: 1 });
    expect(gameplayDeltaForEvent("BLOCK_BREAK", {})).toMatchObject({ blocksBroken: 1 });
  });

  it("does not turn unrelated snapshots into player counters", () => {
    expect(Object.values(gameplayDeltaForEvent("METRIC_SNAPSHOT", {}))).toEqual([0, 0, 0, 0, 0]);
  });
});
