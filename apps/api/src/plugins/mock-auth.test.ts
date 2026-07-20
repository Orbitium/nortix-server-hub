import { describe, expect, it } from "vitest";
import { resolveMockUserId } from "./mock-auth.js";

describe("resolveMockUserId", () => {
  it("keeps requests anonymous when no explicit mock identity is supplied", () => {
    expect(resolveMockUserId(undefined)).toBeUndefined();
    expect(resolveMockUserId("   ")).toBeUndefined();
  });

  it("accepts an explicitly selected local mock identity", () => {
    expect(resolveMockUserId(" seed-firebase-5 ")).toBe("seed-firebase-5");
  });
});
