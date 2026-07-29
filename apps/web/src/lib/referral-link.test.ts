import { describe, expect, it } from "vitest";
import { referralRegistrationUrl } from "./referral-link";

describe("referralRegistrationUrl", () => {
  it("creates a complete registration URL carrying the invite code", () => {
    const result = referralRegistrationUrl("https://hub.nortixlabs.com", "NFX-ABCD-2345");
    const url = new URL(result);

    expect(url.origin).toBe("https://hub.nortixlabs.com");
    expect(url.pathname).toBe("/register");
    expect(url.searchParams.get("invite")).toBe("NFX-ABCD-2345");
    expect(url.searchParams.get("next")).toBe("/dashboard/referrals");
  });

  it("does not inherit a path from the supplied origin", () => {
    expect(referralRegistrationUrl("http://localhost:5173/dashboard", "NFX-TEST-6789")).toBe(
      "http://localhost:5173/register?invite=NFX-TEST-6789&next=%2Fdashboard%2Freferrals",
    );
  });
});
