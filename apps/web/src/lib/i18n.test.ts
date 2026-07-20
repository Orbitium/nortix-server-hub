import { describe, expect, it } from "vitest";
import { formatUsd, supportedLocales, translate } from "./i18n";

describe("translations", () => {
  it("provides all five requested locales", () => {
    expect(supportedLocales).toEqual(["en", "tr", "es", "de", "pt"]);
  });

  it("interpolates translated values without translating Sparks", () => {
    for (const locale of supportedLocales) {
      const value = translate(locale, "home.upToSparks", { count: 125 });
      expect(value).toContain("125");
      expect(value).toContain("Sparks");
    }
  });

  it("keeps monetary formatting on the dollar symbol for every locale", () => {
    for (const locale of supportedLocales) {
      expect(formatUsd(locale, 42)).toMatch(/^\$/);
    }
  });
});
