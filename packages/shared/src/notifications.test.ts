import { describe, expect, it } from "vitest";
import {
  AdminMessageInputSchema,
  NotificationPreferenceInputSchema,
  rolePermissions,
} from "./index.js";

describe("notification and messaging contracts", () => {
  it("limits Nortix message delivery to platform administrators", () => {
    expect(rolePermissions.ADMIN).toContain("message:send");
    expect(rolePermissions.MODERATOR).not.toContain("message:send");
    expect(rolePermissions.SERVER_OWNER).not.toContain("message:send");
  });

  it("requires a username only for direct messages", () => {
    expect(() =>
      AdminMessageInputSchema.parse({
        audience: "USER",
        severity: "WARNING",
        status: "SENT",
        title: "Account review update",
        body: "Your account review has been updated.",
      }),
    ).toThrow();
    expect(
      AdminMessageInputSchema.parse({
        audience: "USER",
        targetUsername: "tester5",
        severity: "WARNING",
        status: "SENT",
        title: "Account review update",
        body: "Your account review has been updated.",
        actionUrl: "/dashboard/inbox",
      }).targetUsername,
    ).toBe("tester5");
  });

  it("rejects external action links", () => {
    expect(() =>
      AdminMessageInputSchema.parse({
        audience: "ALL_USERS",
        severity: "INFO",
        status: "DRAFT",
        title: "Product update",
        body: "A new Nortix product update is available.",
        actionUrl: "https://example.com",
      }),
    ).toThrow();
  });

  it("accepts a complete preference update", () => {
    expect(
      NotificationPreferenceInputSchema.parse({
        campaignActivity: true,
        questsAndStreaks: false,
        sparksActivity: true,
        serverOperations: true,
        teamActivity: true,
        productUpdates: false,
        emailProductUpdates: false,
      }).questsAndStreaks,
    ).toBe(false);
  });
});
