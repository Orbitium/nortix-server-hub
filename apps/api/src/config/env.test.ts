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
  it("rejects project-ID-only Firebase verification in production", () => {
    expect(() => parseEnv({
      ...production,
      FIREBASE_CLIENT_EMAIL: undefined,
      FIREBASE_PRIVATE_KEY: undefined,
    })).toThrow(/requires GOOGLE_APPLICATION_CREDENTIALS/i);
  });

  it("accepts a Firebase service-account credential file", () => {
    const parsed = parseEnv({
      ...production,
      FIREBASE_CLIENT_EMAIL: undefined,
      FIREBASE_PRIVATE_KEY: undefined,
      GOOGLE_APPLICATION_CREDENTIALS: "/run/secrets/firebase-service-account.json",
    });
    expect(parsed.GOOGLE_APPLICATION_CREDENTIALS).toBe(
      "/run/secrets/firebase-service-account.json",
    );
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
