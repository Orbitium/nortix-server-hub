import {
  createHash,
  createPublicKey,
  generateKeyPairSync,
  verify,
} from "node:crypto";
import { prisma, Prisma } from "@nortix/database";
import type { FastifyRequest } from "fastify";

export const PLUGIN_KEY_ALGORITHM = "ECDSA_P256_SHA256";
export const PLUGIN_REQUEST_WINDOW_MS = 5 * 60_000;

type PluginKeyPair = {
  algorithm: typeof PLUGIN_KEY_ALGORITHM;
  privateKey: string;
  publicKey: string;
};

export const generatePluginKeyPair = (): PluginKeyPair => {
  const { privateKey, publicKey } = generateKeyPairSync("ec", {
    namedCurve: "prime256v1",
  });
  const privateJwk = privateKey.export({ format: "jwk" });
  const publicJwk = publicKey.export({ format: "jwk" });
  if (!privateJwk.d || !publicJwk.x || !publicJwk.y) {
    throw new Error("The plugin signing key could not be generated.");
  }
  return {
    algorithm: PLUGIN_KEY_ALGORITHM,
    privateKey: `p256_${privateJwk.d}`,
    publicKey: `p256_${publicJwk.x}.${publicJwk.y}`,
  };
};

export const pluginBodyHash = (body: unknown) =>
  createHash("sha256")
    .update(typeof body === "string" ? body : body === undefined ? "" : JSON.stringify(body))
    .digest("hex");

export const pluginCanonicalPath = (url: string) =>
  url.replace(/^\/api(?=\/v1\/)/, "").replace(/^\/v1(?=\/plugin(?:\/|\?))/, "");

export const canonicalPluginRequest = (input: {
  method: string;
  path: string;
  serverId: string;
  keyId: string;
  timestamp: string;
  nonce: string;
  idempotencyKey: string;
  bodyHash: string;
}) =>
  [
    input.method.toUpperCase(),
    input.path,
    input.serverId,
    input.keyId,
    input.timestamp,
    input.nonce,
    input.idempotencyKey,
    input.bodyHash,
  ].join("\n");

const publicKeyObject = (encoded: string) => {
  const match = /^p256_([A-Za-z0-9_-]{40,50})\.([A-Za-z0-9_-]{40,50})$/.exec(encoded);
  if (!match) throw new Error("The server plugin public key is invalid.");
  return createPublicKey({
    format: "jwk",
    key: { kty: "EC", crv: "P-256", x: match[1], y: match[2] },
  });
};

export const verifyPluginSignature = (
  publicKey: string,
  canonical: string,
  signature: string,
) =>
  verify(
    "sha256",
    Buffer.from(canonical),
    publicKeyObject(publicKey),
    Buffer.from(signature, "base64url"),
  );

const authenticationError = (message: string) =>
  Object.assign(new Error(message), { statusCode: 401 });

export const authenticateSignedPluginRequest = async (
  request: FastifyRequest,
  expectedServerId: string,
  requiredScope = "plugin:events",
) => {
  const serverId = String(request.headers["x-nortix-server-id"] ?? "");
  const keyId = String(request.headers["x-nortix-key-id"] ?? "");
  const timestamp = String(request.headers["x-nortix-timestamp"] ?? "");
  const nonce = String(request.headers["x-nortix-nonce"] ?? "");
  const signature = String(request.headers["x-nortix-signature"] ?? "");
  const idempotencyKey = String(request.headers["idempotency-key"] ?? "");
  const timestampMs = Date.parse(timestamp);

  if (
    serverId !== expectedServerId ||
    !/^[A-Za-z0-9_-]{1,120}$/.test(serverId) ||
    !/^[A-Za-z0-9_-]{8,120}$/.test(keyId) ||
    !Number.isFinite(timestampMs) ||
    Math.abs(Date.now() - timestampMs) > PLUGIN_REQUEST_WINDOW_MS ||
    !/^[a-f0-9-]{16,64}$/i.test(nonce) ||
    !/^[A-Za-z0-9:_-]{8,160}$/.test(idempotencyKey) ||
    !/^[A-Za-z0-9_-]{64,160}$/.test(signature)
  ) {
    throw authenticationError("The signed server plugin request is invalid or expired.");
  }

  const credential = await prisma.integrationApiKey.findFirst({
    where: {
      id: keyId,
      serverId,
      algorithm: PLUGIN_KEY_ALGORITHM,
      publicKey: { not: null },
      revokedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    include: { server: true },
  });
  if (!credential || !credential.publicKey || !credential.scopes.includes(requiredScope)) {
    throw authenticationError("The server plugin signing key is invalid or revoked.");
  }
  if (!credential.server.claimed || credential.server.verificationStatus !== "VERIFIED") {
    throw authenticationError("Server verification is required before accepting plugin evidence.");
  }

  const canonical = canonicalPluginRequest({
    method: request.method,
    path: pluginCanonicalPath(request.raw.url ?? request.url),
    serverId,
    keyId,
    timestamp,
    nonce,
    idempotencyKey,
    bodyHash: pluginBodyHash(
      (request as typeof request & { rawBody?: string }).rawBody ?? request.body,
    ),
  });
  let valid = false;
  try {
    valid = verifyPluginSignature(credential.publicKey, canonical, signature);
  } catch {
    valid = false;
  }
  if (!valid) throw authenticationError("The server plugin request signature is invalid.");

  try {
    await prisma.$transaction([
      prisma.pluginRequestNonce.create({
        data: {
          credentialId: credential.id,
          nonce,
          expiresAt: new Date(timestampMs + PLUGIN_REQUEST_WINDOW_MS),
        },
      }),
      prisma.integrationApiKey.update({
        where: { id: credential.id },
        data: { lastUsedAt: new Date() },
      }),
      prisma.pluginRequestNonce.deleteMany({
        where: { expiresAt: { lt: new Date(Date.now() - PLUGIN_REQUEST_WINDOW_MS) } },
      }),
    ]);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw authenticationError("The signed server plugin request has already been used.");
    }
    throw error;
  }
  return credential;
};
