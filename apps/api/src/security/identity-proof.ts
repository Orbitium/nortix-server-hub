import { createHmac, timingSafeEqual } from "node:crypto";

export type PremiumIdentityProofInput = {
  code: string;
  uuid: string;
  username: string;
};

export const premiumIdentityCanonicalProof = (
  timestamp: string,
  nonce: string,
  input: PremiumIdentityProofInput,
) => `${timestamp}.${nonce}.${input.code}.${input.uuid}.${input.username}`;

export const verifyPremiumIdentityProof = (
  secret: string,
  input: PremiumIdentityProofInput,
  headers: { timestamp: string; nonce: string; signature: string },
  now = new Date(),
) => {
  const timestampMs = Date.parse(headers.timestamp);
  const signature = headers.signature.toLowerCase();
  if (
    !Number.isFinite(timestampMs) ||
    Math.abs(now.getTime() - timestampMs) > 2 * 60_000 ||
    !/^[a-f0-9-]{16,64}$/i.test(headers.nonce) ||
    !/^[a-f0-9]{64}$/.test(signature)
  ) {
    return false;
  }
  const expected = createHmac("sha256", secret)
    .update(premiumIdentityCanonicalProof(headers.timestamp, headers.nonce, input))
    .digest("hex");
  return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
};
