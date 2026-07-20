import { describe, expect, it } from "vitest";
import {
  allowsPlayerMilestoneSubmission,
  canAccessServer,
  validatePluginEvent,
} from "./policies.js";

describe("authorization policies", () => {
  it("does not grant analysts integration access", () => {
    expect(canAccessServer("owner", "member", "ANALYST", "integrations")).toBe(false);
    expect(canAccessServer("owner", "member", "OPERATOR", "integrations")).toBe(true);
    expect(canAccessServer("owner", "owner", undefined, "integrations")).toBe(true);
  });

  it("keeps integration-verified milestones out of client submission paths", () => {
    expect(allowsPlayerMilestoneSubmission("MANUAL")).toBe(true);
    expect(allowsPlayerMilestoneSubmission("SERVER_PLUGIN")).toBe(false);
    expect(allowsPlayerMilestoneSubmission("API")).toBe(false);
  });
});

describe("plugin evidence policy", () => {
  const base = {
    instanceId: "paper-instance",
    type: "METRIC_SNAPSHOT",
    occurredAt: "2026-07-20T12:00:00.000Z",
    minecraftUuid: "123e4567-e89b-42d3-a456-426614174000",
    metadata: { metric: "SKYBLOCK_LEVEL", value: 12 },
  };

  it("requires a bound instance and an advertised known metric", () => {
    expect(() =>
      validatePluginEvent(base, {
        boundInstanceId: "another-instance",
        advertisedMetrics: ["SKYBLOCK_LEVEL"],
        now: new Date("2026-07-20T12:01:00.000Z"),
      }),
    ).toThrow(/instance verification/i);
    expect(() =>
      validatePluginEvent(base, {
        boundInstanceId: "paper-instance",
        advertisedMetrics: [],
        now: new Date("2026-07-20T12:01:00.000Z"),
      }),
    ).toThrow(/advertised capability/i);
  });

  it("rejects replay-window and implausible metric values", () => {
    expect(() =>
      validatePluginEvent(base, {
        boundInstanceId: "paper-instance",
        advertisedMetrics: ["SKYBLOCK_LEVEL"],
        now: new Date("2026-07-22T12:00:00.000Z"),
      }),
    ).toThrow(/delivery window/i);
    expect(() =>
      validatePluginEvent(
        { ...base, metadata: { metric: "SKYBLOCK_LEVEL", value: Number.POSITIVE_INFINITY } },
        {
          boundInstanceId: "paper-instance",
          advertisedMetrics: ["SKYBLOCK_LEVEL"],
          now: new Date("2026-07-20T12:01:00.000Z"),
        },
      ),
    ).toThrow(/advertised capability/i);
  });
});
