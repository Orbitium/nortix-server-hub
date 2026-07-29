import { createPrivateKey, sign } from "node:crypto";
import {
  canonicalPluginRequest,
  pluginBodyHash,
} from "../security/plugin-request-signing.js";

const args = process.argv.slice(2);
const readArg = (name: string, fallback = "") => {
  const index = args.indexOf(name);
  return index >= 0 ? (args[index + 1] ?? fallback) : fallback;
};
const requiredArg = (name: string) => {
  const value = readArg(name);
  if (!value) throw new Error(`${name} is required.`);
  return value;
};

const serverId = requiredArg("--server");
const keyId = requiredArg("--key-id");
const encodedPrivateKey = requiredArg("--private-key").replace(/^p256_/, "");
const publicParts = requiredArg("--public-key").replace(/^p256_/, "").split(".");
if (publicParts.length !== 2) throw new Error("--public-key is malformed.");

const event = {
  id: `sim-${crypto.randomUUID()}`,
  serverId,
  instanceId: readArg("--instance", "local-simulator"),
  type: readArg("--type", "PLAYER_JOIN"),
  occurredAt: new Date().toISOString(),
  minecraftUuid: readArg("--minecraft-uuid", crypto.randomUUID()),
  minecraftUsername: readArg("--minecraft-username", "LocalTester"),
  metadata: { simulator: true },
};
const path = "/plugin/events";
const timestamp = new Date().toISOString();
const nonce = crypto.randomUUID();
const raw = JSON.stringify(event);
const canonical = canonicalPluginRequest({
  method: "POST",
  path,
  serverId,
  keyId,
  timestamp,
  nonce,
  idempotencyKey: event.id,
  bodyHash: pluginBodyHash(raw),
});
const privateKey = createPrivateKey({
  format: "jwk",
  key: {
    kty: "EC",
    crv: "P-256",
    d: encodedPrivateKey,
    x: publicParts[0],
    y: publicParts[1],
  },
});
const signature = sign("sha256", Buffer.from(canonical), privateKey).toString("base64url");
const apiBase = (process.env.API_BASE_URL ?? "http://localhost:4000/v1").replace(/\/$/, "");
const response = await fetch(`${apiBase}${path}`, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "x-nortix-server-id": serverId,
    "x-nortix-key-id": keyId,
    "x-nortix-timestamp": timestamp,
    "x-nortix-nonce": nonce,
    "x-nortix-signature": signature,
    "idempotency-key": event.id,
  },
  body: raw,
});
console.info(response.status, await response.text());
