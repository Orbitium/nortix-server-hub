import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  HOST: z.string().default("0.0.0.0"),
  WEB_ORIGIN: z.string().default("http://localhost:5173"),
  DATABASE_URL: z.string().min(1),
  AUTH_MODE: z.enum(["firebase", "mock"]).default("mock"),
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),
  INTEGRATION_SIGNING_SECRET: z.string().min(16).default("local-integration-secret"),
  PAYMENT_WEBHOOK_SECRET: z.string().min(16).default("local-payment-secret"),
  IDENTITY_VERIFICATION_SECRET: z.string().min(32).default("local-identity-verification-secret"),
  MIN_WITHDRAWAL_USD: z.coerce.number().int().min(1).default(10),
});

export type Env = z.infer<typeof EnvSchema>;

export const parseEnv = (input: NodeJS.ProcessEnv): Env => {
  const result = EnvSchema.safeParse(input);
  if (!result.success) {
    throw new Error(`Invalid environment configuration: ${z.prettifyError(result.error)}`);
  }
  if (
    result.data.AUTH_MODE === "firebase" &&
    (!result.data.FIREBASE_PROJECT_ID ||
      !result.data.FIREBASE_CLIENT_EMAIL ||
      !result.data.FIREBASE_PRIVATE_KEY)
  ) {
    throw new Error("Firebase Admin credentials are required when AUTH_MODE=firebase.");
  }
  if (result.data.NODE_ENV === "production" && result.data.AUTH_MODE !== "firebase") {
    throw new Error("Production requires AUTH_MODE=firebase; mock authentication is development-only.");
  }
  if (
    result.data.NODE_ENV === "production" &&
    (result.data.INTEGRATION_SIGNING_SECRET === "local-integration-secret" ||
      result.data.PAYMENT_WEBHOOK_SECRET === "local-payment-secret")
  ) {
    throw new Error("Production signing and webhook secrets must be explicitly configured.");
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
