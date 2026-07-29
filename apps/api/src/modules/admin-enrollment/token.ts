import { createHash, randomBytes } from "node:crypto";

export const ADMIN_ENROLLMENT_TOKEN_TTL_MS = 10 * 60_000;
export const ADMIN_ENROLLMENT_TOKEN_PREFIX = "nortix_admin_";

export const generateAdminEnrollmentToken = () =>
  `${ADMIN_ENROLLMENT_TOKEN_PREFIX}${randomBytes(32).toString("base64url")}`;

export const hashAdminEnrollmentToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");
