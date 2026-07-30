import { auth } from "./firebase";
import { developmentMockIdentity } from "./auth-session";
import { buildApiHeaders } from "./api-headers";

const API_URL = import.meta.env.VITE_API_URL ?? "/api/v1";

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await auth?.currentUser?.getIdToken();
  const authenticationHeaders: Record<string, string> = token
    ? { Authorization: `Bearer ${token}` }
    : developmentMockIdentity
      ? { "x-mock-user": developmentMockIdentity }
      : {};
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: buildApiHeaders(options, authenticationHeaders),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Request failed" }));
    throw new Error(error.message ?? "Request failed");
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
