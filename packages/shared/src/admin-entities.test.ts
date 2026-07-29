import { describe, expect, it } from "vitest";
import {
  AdminServerStatusActionSchema,
  AdminUserStatusActionSchema,
  rolePermissions,
} from "./index.js";

describe("admin entity status contracts", () => {
  it("keeps account and server status actions admin-only", () => {
    expect(rolePermissions.ADMIN).toContain("user:suspend");
    expect(rolePermissions.ADMIN).toContain("server:moderate");
    expect(rolePermissions.MODERATOR).not.toContain("user:suspend");
    expect(rolePermissions.MODERATOR).not.toContain("server:moderate");
    expect(rolePermissions.SERVER_OWNER).not.toContain("server:moderate");
  });

  it("requires a reason and explicit confirmation for account restrictions", () => {
    expect(() =>
      AdminUserStatusActionSchema.parse({
        action: "SUSPEND",
        reason: "",
        confirmation: "user-id",
      }),
    ).toThrow();
    expect(
      AdminUserStatusActionSchema.parse({
        action: "BAN",
        reason: "Repeated verified abuse.",
        confirmation: "user-id",
      }),
    ).toMatchObject({ action: "BAN" });
  });

  it("accepts only defined server moderation transitions", () => {
    expect(() =>
      AdminServerStatusActionSchema.parse({
        action: "DELETE",
        reason: "Invalid destructive action.",
        confirmation: "server-id",
      }),
    ).toThrow();
    expect(
      AdminServerStatusActionSchema.parse({
        action: "HIDE",
        reason: "Temporarily hidden during review.",
        confirmation: "server-id",
      }),
    ).toMatchObject({ action: "HIDE" });
  });
});
