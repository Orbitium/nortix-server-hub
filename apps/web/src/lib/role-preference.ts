export const ROLE_PREFERENCE_STORAGE_KEY = "nortix-role-preference";
export const ROLE_PREFERENCE_CHANGED_EVENT = "nortix-role-preference-changed";

export type RolePreference = "player" | "owner";

export function parseRolePreference(value: string | null): RolePreference | null {
  return value === "player" || value === "owner" ? value : null;
}

export function readRolePreference(): RolePreference | null {
  try {
    return parseRolePreference(window.localStorage.getItem(ROLE_PREFERENCE_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function saveRolePreference(preference: RolePreference) {
  try {
    window.localStorage.setItem(ROLE_PREFERENCE_STORAGE_KEY, preference);
  } catch {
    // The current page can still reflect the choice if persistent storage is unavailable.
  }
  window.dispatchEvent(
    new CustomEvent<RolePreference>(ROLE_PREFERENCE_CHANGED_EVENT, { detail: preference }),
  );
}
