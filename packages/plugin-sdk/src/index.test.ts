import { describe, expect, it } from "vitest";
import {
  PluginCapabilitiesHandshakeSchema,
  PluginCrackedClaimCompletionSchema,
  PluginCredentialResponseSchema,
  PluginPresenceSnapshotSchema,
  ServerPluginEventSchema,
} from "./index.js";

describe("Minecraft milestone plugin contracts", () => {
  it("accepts only server-bound cracked claim completion payloads", () => {
    const payload = {
      serverId: "server-1",
      instanceId: "instance-123",
      claimCode: "NX-C-A1B2-C3D4",
      minecraftUuid: "123e4567-e89b-12d3-a456-426614174000",
      minecraftUsername: "Alex_Builder",
      occurredAt: "2026-07-29T12:00:00.000Z",
    };
    expect(PluginCrackedClaimCompletionSchema.safeParse(payload).success).toBe(true);
    expect(
      PluginCrackedClaimCompletionSchema.safeParse({
        ...payload,
        claimCode: "NX-C-WRONG",
      }).success,
    ).toBe(false);
    expect(
      PluginCrackedClaimCompletionSchema.safeParse({
        ...payload,
        unexpectedUserId: "user-1",
      }).success,
    ).toBe(false);
  });

  it("accepts only the server-bound P-256 credential shape", () => {
    const credential = {
      serverId: "server-1",
      serverName: "Example",
      keyId: "credential-123",
      algorithm: "ECDSA_P256_SHA256",
      privateKey: `p256_${"a".repeat(43)}`,
      publicKey: `p256_${"b".repeat(43)}.${"c".repeat(43)}`,
      shownOnce: true,
    };
    expect(PluginCredentialResponseSchema.safeParse(credential).success).toBe(true);
    expect(
      PluginCredentialResponseSchema.safeParse({ ...credential, algorithm: "HMAC_SHA256" }).success,
    ).toBe(false);
  });

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

  it("accepts a first-join observation only with an exact Minecraft name", () => {
    expect(ServerPluginEventSchema.parse({
      id: "event-join-12345678",
      serverId: "server",
      instanceId: "instance-1234",
      type: "PLAYER_JOIN",
      occurredAt: new Date().toISOString(),
      minecraftUuid: "123e4567-e89b-42d3-a456-426614174000",
      minecraftUsername: "nortix123",
      metadata: {},
    }).minecraftUsername).toBe("nortix123");
  });

  it("requires a privacy-minimized roster matching the aggregate player count", () => {
    const snapshot = {
      id: "presence-12345678",
      serverId: "server",
      instanceId: "instance-12345678",
      platform: "PAPER",
      pluginVersion: "0.4.0",
      observedAt: "2026-07-21T12:00:00.000Z",
      onlinePlayers: 1,
      players: [{ minecraftUuid: "123e4567-e89b-42d3-a456-426614174000" }],
    };
    expect(PluginPresenceSnapshotSchema.safeParse(snapshot).success).toBe(true);
    expect(
      PluginPresenceSnapshotSchema.safeParse({ ...snapshot, onlinePlayers: 2 }).success,
    ).toBe(false);
  });
});
