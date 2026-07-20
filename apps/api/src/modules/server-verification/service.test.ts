import { describe, expect, it } from "vitest";
import { createVerificationCode } from "./service.js";

describe("server verification codes", () => {
  it("creates an MOTD-safe code with enough entropy", () => {
    const code = createVerificationCode();
    expect(code).toMatch(/^NORTIX-[A-F0-9]{4}-[A-F0-9]{4}$/);
    expect(createVerificationCode()).not.toBe(code);
  });
});

