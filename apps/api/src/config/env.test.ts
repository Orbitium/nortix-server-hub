import { describe, expect, it } from "vitest";
import { parseEnv } from "./env.js";

const production = {
  NODE_ENV: "production",
  DATABASE_URL: "postgresql://example",
  AUTH_MODE: "firebase",
  FIREBASE_PROJECT_ID: "project",
  FIREBASE_CLIENT_EMAIL: "firebase@example.test",
  FIREBASE_PRIVATE_KEY: "private-key",
  INTEGRATION_SIGNING_SECRET: "a-secure-integration-secret",
  PAYMENT_WEBHOOK_SECRET: "a-secure-payment-secret",
  IDENTITY_VERIFICATION_SECRET: "a-separate-secure-identity-verification-secret",
};

describe("production environment policy", () => {
  it("allows Firebase public-key token verification with only a project ID", () => {
    const parsed = parseEnv({
      ...production,
      FIREBASE_CLIENT_EMAIL: undefined,
      FIREBASE_PRIVATE_KEY: undefined,
    });
    expect(parsed.FIREBASE_PROJECT_ID).toBe("project");
  });

  it("rejects a partial Firebase Admin credential", () => {
    expect(() => parseEnv({ ...production, FIREBASE_PRIVATE_KEY: undefined })).toThrow(
      /both be configured/i,
    );
  });

  it("requires a Firebase project ID", () => {
    expect(() => parseEnv({ ...production, FIREBASE_PROJECT_ID: undefined })).toThrow(
      /FIREBASE_PROJECT_ID/i,
    );
  });

  it("rejects mock authentication", () => {
    expect(() => parseEnv({ ...production, AUTH_MODE: "mock" })).toThrow(/development-only/i);
  });

  it("rejects development secrets", () => {
    expect(() =>
      parseEnv({ ...production, INTEGRATION_SIGNING_SECRET: "local-integration-secret" }),
    ).toThrow(/explicitly configured/i);
  });
});
