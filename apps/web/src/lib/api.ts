import { auth } from "./firebase";

const API_URL = import.meta.env.VITE_API_URL ?? "/api/v1";

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await auth?.currentUser?.getIdToken();
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : { "x-mock-user": "seed-firebase-5" }),
      ...options.headers,
    },
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Request failed" }));
    throw new Error(error.message ?? "Request failed");
  }
  return response.json() as Promise<T>;
}
