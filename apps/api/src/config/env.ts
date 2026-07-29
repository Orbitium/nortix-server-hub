import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  HOST: z.string().default("0.0.0.0"),
  WEB_ORIGIN: z.string().default("http://localhost:5173"),
  DATABASE_URL: z.string().min(1),
  AUTH_MODE: z.enum(["firebase", "mock"]).default("mock"),
  FIREBASE_PROJECT_ID: z.string().trim().optional(),
  GOOGLE_APPLICATION_CREDENTIALS: z.string().trim().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().trim().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),
  INTEGRATION_SIGNING_SECRET: z.string().min(16).default("local-integration-secret"),
  SERVER_VALIDATION_SECRET: z.string().min(32).default("local-server-validation-secret-please-change"),
  PAYMENT_WEBHOOK_SECRET: z.string().min(16).default("local-payment-secret"),
  STORE_PROCEEDS_CENTS_PER_1000_SPARKS: z.coerce.number().int().min(0).max(100_000).default(0),
  STORE_PAYOUT_REQUESTS_ENABLED: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  STORE_MIN_PAYOUT_CENTS: z.coerce.number().int().min(1_000).max(10_000_000).default(1_000),
  STORE_MEDIA_DIRECTORY: z.string().trim().min(1).default("./var/store-media"),
  IDENTITY_VERIFICATION_SECRET: z.string().min(32).default("local-identity-verification-secret"),
  TURNSTILE_SITE_KEY: z.string().trim().min(1).default("1x00000000000000000000AA"),
  TURNSTILE_SECRET_KEY: z
    .string()
    .trim()
    .min(1)
    .default("1x0000000000000000000000000000000AA"),
  DISCOVERY_SCAN_ENABLED: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),
  DISCOVERY_SCAN_INTERVAL_MINUTES: z.coerce.number().int().min(10).default(10),
  DISCOVERY_SCAN_SPACING_MS: z.coerce.number().int().min(12_000).default(12_000),
  MCSRVSTAT_USER_AGENT: z
    .string()
    .trim()
    .min(10)
    .default("NortixServerHub/1.0 (+https://hub.nortixlabs.com/contact)"),
  GOOGLE_AD_MANAGER_REWARDED_AD_UNIT_PATH: z.string().trim().min(3).optional(),
});

export type Env = z.infer<typeof EnvSchema>;

export const parseEnv = (input: NodeJS.ProcessEnv): Env => {
  const result = EnvSchema.safeParse(input);
  if (!result.success) {
    throw new Error(`Invalid environment configuration: ${z.prettifyError(result.error)}`);
  }
  if (result.data.AUTH_MODE === "firebase" && !result.data.FIREBASE_PROJECT_ID) {
    throw new Error("FIREBASE_PROJECT_ID is required when AUTH_MODE=firebase.");
  }
  if (Boolean(result.data.FIREBASE_CLIENT_EMAIL) !== Boolean(result.data.FIREBASE_PRIVATE_KEY)) {
    throw new Error(
      "FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY must either both be configured or both be omitted.",
    );
  }
  const hasFirebaseCredentialFile = Boolean(result.data.GOOGLE_APPLICATION_CREDENTIALS);
  const hasInlineFirebaseCredential = Boolean(
    result.data.FIREBASE_CLIENT_EMAIL && result.data.FIREBASE_PRIVATE_KEY,
  );
  if (
    result.data.NODE_ENV === "production" &&
    result.data.AUTH_MODE === "firebase" &&
    !hasFirebaseCredentialFile &&
    !hasInlineFirebaseCredential
  ) {
    throw new Error(
      "Production Firebase authentication requires GOOGLE_APPLICATION_CREDENTIALS or a complete inline Firebase Admin credential.",
    );
  }
  if (
    result.data.STORE_PAYOUT_REQUESTS_ENABLED &&
    result.data.STORE_PROCEEDS_CENTS_PER_1000_SPARKS <= 0
  ) {
    throw new Error(
      "STORE_PROCEEDS_CENTS_PER_1000_SPARKS must be configured when store payout requests are enabled.",
    );
  }
  if (result.data.NODE_ENV === "production" && result.data.AUTH_MODE !== "firebase") {
    throw new Error("Production requires AUTH_MODE=firebase; mock authentication is development-only.");
  }
  if (result.data.NODE_ENV === "production") {
    const placeholderSecrets = [
      result.data.INTEGRATION_SIGNING_SECRET === "local-integration-secret"
        ? "INTEGRATION_SIGNING_SECRET"
        : null,
      result.data.PAYMENT_WEBHOOK_SECRET === "local-payment-secret"
        ? "PAYMENT_WEBHOOK_SECRET"
        : null,
      result.data.SERVER_VALIDATION_SECRET === "local-server-validation-secret-please-change"
        ? "SERVER_VALIDATION_SECRET"
        : null,
      result.data.TURNSTILE_SITE_KEY === "1x00000000000000000000AA"
        ? "TURNSTILE_SITE_KEY"
        : null,
      result.data.TURNSTILE_SECRET_KEY === "1x0000000000000000000000000000000AA"
        ? "TURNSTILE_SECRET_KEY"
        : null,
    ].filter((name): name is string => name !== null);
    if (placeholderSecrets.length > 0) {
      throw new Error(
        `Production secrets must be explicitly configured: ${placeholderSecrets.join(", ")}.`,
      );
    }
  }
  if (
    result.data.NODE_ENV === "production" &&
    result.data.IDENTITY_VERIFICATION_SECRET === "local-identity-verification-secret"
  ) {
    throw new Error("Production identity verification secret must be explicitly configured.");
  }
  return result.data;
};

export const loadEnv = (): Env => parseEnv(process.env);
