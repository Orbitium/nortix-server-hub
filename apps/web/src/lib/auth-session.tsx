import { onIdTokenChanged } from "firebase/auth";
import { createContext, useContext, useEffect, useState } from "react";
import { auth } from "./firebase";

export type AuthSessionStatus = "initializing" | "anonymous" | "authenticated";

export const developmentMockIdentity =
  import.meta.env.DEV && import.meta.env.VITE_MOCK_USER?.trim()
    ? import.meta.env.VITE_MOCK_USER.trim()
    : undefined;

const initialStatus = (): AuthSessionStatus => {
  if (developmentMockIdentity || auth?.currentUser) return "authenticated";
  return auth ? "initializing" : "anonymous";
};

const AuthSessionContext = createContext<AuthSessionStatus>(initialStatus());

export function AuthSessionProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthSessionStatus>(initialStatus);

  useEffect(() => {
    if (developmentMockIdentity) {
      setStatus("authenticated");
      return;
    }
    if (!auth) {
      setStatus("anonymous");
      return;
    }
    return onIdTokenChanged(auth, (user) => {
      setStatus(user ? "authenticated" : "anonymous");
    });
  }, []);

  return <AuthSessionContext.Provider value={status}>{children}</AuthSessionContext.Provider>;
}

export function useAuthSession() {
  const status = useContext(AuthSessionContext);
  const effectiveStatus =
    status !== "authenticated" && (developmentMockIdentity || auth?.currentUser)
      ? "authenticated"
      : status;
  return {
    status: effectiveStatus,
    isAuthenticated: effectiveStatus === "authenticated",
    isInitializing: effectiveStatus === "initializing",
  };
}

export function accountCreationUrl(next: string, reason: "campaign" | "server") {
  const safeNext = next.startsWith("/") ? next : "/dashboard";
  return `/register?next=${encodeURIComponent(safeNext)}&reason=${reason}`;
}
