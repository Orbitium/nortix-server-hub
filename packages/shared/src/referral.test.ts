import { describe, expect, it } from "vitest";
import { ClaimReferralInviteInputSchema } from "./index.js";

describe("referral invite input", () => {
  it("normalizes valid invite codes", () => {
    expect(ClaimReferralInviteInputSchema.parse({ code: "nfx-abcd-2345" })).toEqual({
      code: "NFX-ABCD-2345",
    });
  });

  it("rejects malformed codes and extra input", () => {
    expect(() => ClaimReferralInviteInputSchema.parse({ code: "invite-me" })).toThrow();
    expect(() =>
      ClaimReferralInviteInputSchema.parse({ code: "NFX-ABCD-2345", inviterId: "user-id" }),
    ).toThrow();
  });
});
