import { describe, expect, it } from "vitest";
import { parseRolePreference } from "./role-preference";

describe("role preference", () => {
  it("accepts the two supported frontend modes", () => {
    expect(parseRolePreference("player")).toBe("player");
    expect(parseRolePreference("owner")).toBe("owner");
  });

  it("rejects missing and unknown values", () => {
    expect(parseRolePreference(null)).toBeNull();
    expect(parseRolePreference("SERVER_OWNER")).toBeNull();
  });
});
