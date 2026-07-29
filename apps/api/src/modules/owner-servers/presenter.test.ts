import { describe, expect, it } from "vitest";
import { presentOwnerPluginState } from "./presenter.js";

describe("presentOwnerPluginState", () => {
  it("reports owner-visible connection state without returning the plugin instance identifier", () => {
    const lastSeenAt = new Date("2026-07-29T12:00:00.000Z");

    expect(
      presentOwnerPluginState({
        pluginInstanceId: "private-instance-id",
        pluginLastSeenAt: lastSeenAt,
      }),
    ).toEqual({
      connected: true,
      lastSeenAt,
    });
  });

  it("represents a server that has not connected a plugin", () => {
    expect(
      presentOwnerPluginState({
        pluginInstanceId: null,
        pluginLastSeenAt: null,
      }),
    ).toEqual({
      connected: false,
      lastSeenAt: null,
    });
  });
});
