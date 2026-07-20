import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  premiumIdentityCanonicalProof,
  verifyPremiumIdentityProof,
} from "./identity-proof.js";

describe("premium identity verification proof", () => {
  const secret = "identity-secret-longer-than-thirty-two-characters";
  const input = {
    code: "NX-ABCD-1234-EF56",
    uuid: "123e4567-e89b-42d3-a456-426614174000",
    username: "NortixPlayer",
  };
  const timestamp = "2026-07-20T12:00:00.000Z";
  const nonce = "123e4567-e89b-42d3-a456-426614174111";
  const signature = createHmac("sha256", secret)
    .update(premiumIdentityCanonicalProof(timestamp, nonce, input))
    .digest("hex");

  it("accepts a fresh proof bound to the exact identity and challenge", () => {
    expect(verifyPremiumIdentityProof(
      secret,
      input,
      { timestamp, nonce, signature },
      new Date("2026-07-20T12:01:00.000Z"),
    )).toBe(true);
  });

  it("rejects tampering and stale replay", () => {
    expect(verifyPremiumIdentityProof(
      secret,
      { ...input, username: "Imposter" },
      { timestamp, nonce, signature },
      new Date("2026-07-20T12:01:00.000Z"),
    )).toBe(false);
    expect(verifyPremiumIdentityProof(
      secret,
      input,
      { timestamp, nonce, signature },
      new Date("2026-07-20T12:03:01.000Z"),
    )).toBe(false);
  });
});
