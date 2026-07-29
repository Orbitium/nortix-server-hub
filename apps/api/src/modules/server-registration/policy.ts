export const normalizeServerHostname = (hostname: string) =>
  hostname.trim().toLowerCase().replace(/\.$/, "");

export const canDeleteServerRegistration = (server: {
  claimed: boolean;
  verificationStatus: "UNVERIFIED" | "PENDING" | "VERIFIED" | "REJECTED" | "EXPIRED";
  verificationScope: "SERVER" | "PROXY_NETWORK" | "PROXY_CHILD";
}) =>
  !server.claimed &&
  server.verificationScope !== "PROXY_CHILD" &&
  ["UNVERIFIED", "PENDING", "REJECTED", "EXPIRED"].includes(server.verificationStatus);
