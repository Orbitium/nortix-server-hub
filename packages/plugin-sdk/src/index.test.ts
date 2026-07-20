import { describe, expect, it } from "vitest";
import {
  PluginCapabilitiesHandshakeSchema,
  ServerPluginEventSchema,
} from "./index.js";

describe("Minecraft milestone plugin contracts", () => {
  it("accepts a proxy-child capability report", () => {
    expect(PluginCapabilitiesHandshakeSchema.parse({
      serverId: "child-server",
      instanceId: "12345678-instance",
      platform: "PAPER",
      pluginVersion: "0.2.0",
      proxyServerName: "skyblock-01",
      capabilities: [{
        id: "bentobox-level",
        provider: "BentoBox + Level",
        category: "SKYBLOCK",
        metrics: ["SKYBLOCK_LEVEL"],
        available: true,
      }],
    }).proxyServerName).toBe("skyblock-01");
  });

  it("requires a known metric event and a Minecraft UUID", () => {
    const result = ServerPluginEventSchema.safeParse({
      id: "event-12345678",
      serverId: "server",
      instanceId: "instance-1234",
      type: "METRIC_SNAPSHOT",
      occurredAt: new Date().toISOString(),
      minecraftUuid: "not-a-uuid",
      metadata: { metric: "SKYBLOCK_LEVEL", value: 100 },
    });
    expect(result.success).toBe(false);
  });
});
