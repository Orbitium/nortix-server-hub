import { Navigate, useLocation } from "react-router-dom";
import { accountCreationUrl, useAuthSession } from "../lib/auth-session";

export function RequireAccount({
  children,
  reason,
}: {
  children: React.ReactNode;
  reason: "campaign" | "server";
}) {
  const location = useLocation();
  const { isAuthenticated, isInitializing } = useAuthSession();
  if (isInitializing) return null;
  if (isAuthenticated) return children;
  return <Navigate to={accountCreationUrl(`${location.pathname}${location.search}`, reason)} replace />;
}

export function RequireSignIn({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { isAuthenticated, isInitializing } = useAuthSession();
  if (isInitializing) return null;
  if (isAuthenticated) return children;
  const next = `${location.pathname}${location.search}`;
  return <Navigate to={`/sign-in?next=${encodeURIComponent(next)}`} replace />;
}
