import { describe, expect, it } from "vitest";
import {
  ADMIN_ENROLLMENT_TOKEN_PREFIX,
  generateAdminEnrollmentToken,
  hashAdminEnrollmentToken,
} from "./token.js";

describe("admin enrollment tokens", () => {
  it("generates high-entropy, URL-safe tokens with only a hash suitable for storage", () => {
    const first = generateAdminEnrollmentToken();
    const second = generateAdminEnrollmentToken();

    expect(first).toMatch(/^nortix_admin_[A-Za-z0-9_-]{43}$/);
    expect(second).not.toBe(first);
    expect(hashAdminEnrollmentToken(first)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashAdminEnrollmentToken(first)).not.toContain(ADMIN_ENROLLMENT_TOKEN_PREFIX);
  });

  it("hashes the same token deterministically", () => {
    const token = generateAdminEnrollmentToken();
    expect(hashAdminEnrollmentToken(token)).toBe(hashAdminEnrollmentToken(token));
  });
});
