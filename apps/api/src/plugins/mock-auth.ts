export function resolveMockUserId(header: string | string[] | undefined) {
  const value = Array.isArray(header) ? header[0] : header;
  return value?.trim() || undefined;
}
