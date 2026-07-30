export function buildApiHeaders(
  options: RequestInit,
  authenticationHeaders: HeadersInit = {},
) {
  const headers = new Headers(authenticationHeaders);

  new Headers(options.headers).forEach((value, key) => {
    headers.set(key, value);
  });

  if (typeof options.body === "string" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return headers;
}
