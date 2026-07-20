import { describe, expect, it } from "vitest";
import {
  ServerTeamInviteInputSchema,
  TeamInviteResponseSchema,
  TeamMemberRoleInputSchema,
} from "./index.js";

describe("server team access schemas", () => {
  it("accepts a username invite with a supported role", () => {
    expect(ServerTeamInviteInputSchema.parse({ username: "  BuilderAlex  ", role: "MANAGER" })).toEqual({
      username: "BuilderAlex",
      role: "MANAGER",
    });
  });

  it("rejects unknown roles and invite responses", () => {
    expect(ServerTeamInviteInputSchema.safeParse({ username: "Alex", role: "OWNER" }).success).toBe(false);
    expect(TeamMemberRoleInputSchema.safeParse({ role: "SUPER_ADMIN" }).success).toBe(false);
    expect(TeamInviteResponseSchema.safeParse({ action: "DELETE" }).success).toBe(false);
  });
});
