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
};

describe("production environment policy", () => {
  it("rejects mock authentication", () => {
    expect(() => parseEnv({ ...production, AUTH_MODE: "mock" })).toThrow(/development-only/i);
  });

  it("rejects development secrets", () => {
    expect(() =>
      parseEnv({ ...production, INTEGRATION_SIGNING_SECRET: "local-integration-secret" }),
    ).toThrow(/explicitly configured/i);
  });
});
