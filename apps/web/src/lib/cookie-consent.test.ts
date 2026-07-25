import { describe, expect, it } from "vitest";
import {
  COOKIE_CONSENT_VERSION,
  parseCookiePreferences,
  type CookiePreferences,
} from "./cookie-consent";

describe("cookie consent preferences", () => {
  it("accepts the current, explicit analytics choice", () => {
    const preferences: CookiePreferences = {
      version: COOKIE_CONSENT_VERSION,
      analytics: false,
      updatedAt: "2026-07-25T10:00:00.000Z",
    };

    expect(parseCookiePreferences(JSON.stringify(preferences))).toEqual(preferences);
  });

  it("rejects malformed, incomplete, and outdated preferences", () => {
    expect(parseCookiePreferences("not-json")).toBeNull();
    expect(parseCookiePreferences(JSON.stringify({ version: COOKIE_CONSENT_VERSION }))).toBeNull();
    expect(
      parseCookiePreferences(
        JSON.stringify({ version: 0, analytics: true, updatedAt: "2026-07-25T10:00:00.000Z" }),
      ),
    ).toBeNull();
  });
});
