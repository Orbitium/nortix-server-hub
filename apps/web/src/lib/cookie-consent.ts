export const COOKIE_CONSENT_STORAGE_KEY = "nortix-cookie-consent";
export const COOKIE_CONSENT_VERSION = 1;

export type CookiePreferences = {
  version: typeof COOKIE_CONSENT_VERSION;
  analytics: boolean;
  updatedAt: string;
};

export function parseCookiePreferences(value: string | null): CookiePreferences | null {
  if (!value) return null;

  try {
    const parsed: unknown = JSON.parse(value);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "version" in parsed &&
      parsed.version === COOKIE_CONSENT_VERSION &&
      "analytics" in parsed &&
      typeof parsed.analytics === "boolean" &&
      "updatedAt" in parsed &&
      typeof parsed.updatedAt === "string"
    ) {
      return parsed as CookiePreferences;
    }
  } catch {
    // A malformed or outdated preference should prompt for consent again.
  }

  return null;
}

export function readCookiePreferences(): CookiePreferences | null {
  try {
    return parseCookiePreferences(window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function saveCookiePreferences(analytics: boolean): CookiePreferences {
  const preferences: CookiePreferences = {
    version: COOKIE_CONSENT_VERSION,
    analytics,
    updatedAt: new Date().toISOString(),
  };

  try {
    window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // Keep the in-memory choice for this page even if browser storage is unavailable.
  }

  return preferences;
}

export function clearAnalyticsCookies() {
  const analyticsCookieNames = document.cookie
    .split(";")
    .map((cookie) => cookie.split("=")[0]?.trim())
    .filter((name): name is string => Boolean(name && /^(_ga|_gid|_gat)/.test(name)));
  const hostnameParts = window.location.hostname.split(".");
  const candidateDomains = hostnameParts
    .map((_, index) => hostnameParts.slice(index).join("."))
    .filter((domain) => domain.includes("."));

  for (const name of analyticsCookieNames) {
    document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`;
    for (const domain of candidateDomains) {
      document.cookie = `${name}=; Max-Age=0; Path=/; Domain=${domain}; SameSite=Lax`;
      document.cookie = `${name}=; Max-Age=0; Path=/; Domain=.${domain}; SameSite=Lax`;
    }
  }
}
