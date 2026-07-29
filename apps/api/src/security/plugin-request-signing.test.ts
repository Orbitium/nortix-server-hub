import { createPrivateKey, sign } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  canonicalPluginRequest,
  generatePluginKeyPair,
  pluginBodyHash,
  pluginCanonicalPath,
  verifyPluginSignature,
} from "./plugin-request-signing.js";

describe("plugin request signing", () => {
  it("generates a compact P-256 key pair and a stable canonical request", () => {
    const pair = generatePluginKeyPair();
    expect(pair.privateKey).toMatch(/^p256_[A-Za-z0-9_-]{40,50}$/);
    expect(pair.publicKey).toMatch(/^p256_[A-Za-z0-9_-]{40,50}\.[A-Za-z0-9_-]{40,50}$/);

    const body = { serverId: "server-1", onlinePlayers: 12 };
    const canonical = canonicalPluginRequest({
      method: "post",
      path: "/v1/plugin/presence",
      serverId: "server-1",
      keyId: "credential-1",
      timestamp: "2026-07-29T12:00:00.000Z",
      nonce: "123e4567-e89b-42d3-a456-426614174000",
      idempotencyKey: "presence:one",
      bodyHash: pluginBodyHash(body),
    });
    expect(canonical.split("\n")).toHaveLength(8);
    expect(pluginBodyHash(body)).toHaveLength(64);
    expect(pluginBodyHash('{"value":1.0}')).not.toBe(pluginBodyHash({ value: 1 }));
    expect(pluginCanonicalPath("/api/v1/plugin/events")).toBe("/plugin/events");
    expect(pluginCanonicalPath("/v1/plugin/events?source=paper")).toBe(
      "/plugin/events?source=paper",
    );
  });

  it("creates keys that Node can import for signatures", () => {
    const pair = generatePluginKeyPair();
    const encoded = pair.privateKey.slice("p256_".length);
    const publicParts = pair.publicKey.slice("p256_".length).split(".");
    const privateKey = createPrivateKey({
      format: "jwk",
      key: {
        kty: "EC",
        crv: "P-256",
        d: encoded,
        x: publicParts[0],
        y: publicParts[1],
      },
    });
    const signature = sign("sha256", Buffer.from("nortix"), privateKey).toString("base64url");
    expect(verifyPluginSignature(pair.publicKey, "nortix", signature)).toBe(true);
    expect(verifyPluginSignature(pair.publicKey, "tampered", signature)).toBe(false);
  });
});
