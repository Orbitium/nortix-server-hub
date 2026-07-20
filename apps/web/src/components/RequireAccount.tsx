import { Navigate, useLocation } from "react-router-dom";
import { accountCreationUrl, hasNortixAccountSession } from "../lib/auth-session";

export function RequireAccount({
  children,
  reason,
}: {
  children: React.ReactNode;
  reason: "campaign" | "server";
}) {
  const location = useLocation();
  if (hasNortixAccountSession()) return children;
  return <Navigate to={accountCreationUrl(`${location.pathname}${location.search}`, reason)} replace />;
}
