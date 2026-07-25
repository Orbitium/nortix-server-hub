import { describe, expect, it } from "vitest";
import { rolePermissions } from "@nortix/shared";

describe("campaign authorization", () => {
  it("allows owners to create but not approve campaigns", () => {
    expect(rolePermissions.SERVER_OWNER).toContain("campaign:create");
    expect(rolePermissions.SERVER_OWNER).not.toContain("campaign:publish");
  });

  it("allows moderators to review and publish without internal ledger access", () => {
    expect(rolePermissions.MODERATOR).toContain("campaign:review");
    expect(rolePermissions.MODERATOR).toContain("campaign:publish");
    expect(rolePermissions.MODERATOR).not.toContain("ledger:view_internal");
  });

  it("gives admins the internal ledger permission", () => {
    expect(rolePermissions.ADMIN).toContain("ledger:view_internal");
  });

  it("reserves sponsored creation and termination for Nortix admins", () => {
    expect(rolePermissions.ADMIN).toContain("campaign:admin_create");
    expect(rolePermissions.ADMIN).toContain("campaign:terminate");
    expect(rolePermissions.MODERATOR).not.toContain("campaign:admin_create");
    expect(rolePermissions.MODERATOR).not.toContain("campaign:terminate");
    expect(rolePermissions.SERVER_OWNER).not.toContain("campaign:terminate");
  });
});
