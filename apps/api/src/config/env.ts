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
  MIN_WITHDRAWAL_USD: z.coerce.number().int().min(1).default(10),
});

export type Env = z.infer<typeof EnvSchema>;

export const loadEnv = (): Env => {
  const result = EnvSchema.safeParse(process.env);
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
  return result.data;
};
