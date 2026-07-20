import { auth } from "./firebase";

const API_URL = import.meta.env.VITE_API_URL ?? "/api/v1";

const developmentSeedIdentity = () => {
  if (!import.meta.env.DEV) return undefined;
  if (window.location.pathname.startsWith("/admin")) return "seed-firebase-20";
  if (window.location.pathname.startsWith("/owner")) return "seed-firebase-1";
  return "seed-firebase-5";
};

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await auth?.currentUser?.getIdToken();
  const seedIdentity = developmentSeedIdentity();
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token
        ? { Authorization: `Bearer ${token}` }
        : seedIdentity
          ? { "x-mock-user": seedIdentity }
          : {}),
      ...options.headers,
    },
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Request failed" }));
    throw new Error(error.message ?? "Request failed");
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
