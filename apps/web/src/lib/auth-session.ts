import { auth } from "./firebase";

const sessionKey = "nortix-account-session";

export function hasNortixAccountSession() {
  return Boolean(auth?.currentUser || window.localStorage.getItem(sessionKey) === "active");
}

export function markNortixAccountSession() {
  window.localStorage.setItem(sessionKey, "active");
}

export function accountCreationUrl(next: string, reason: "campaign" | "server") {
  const safeNext = next.startsWith("/") ? next : "/dashboard";
  return `/register?next=${encodeURIComponent(safeNext)}&reason=${reason}`;
}
