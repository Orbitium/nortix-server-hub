import type { ServerTeamRole } from "@nortix/shared";

export type ServerPermission = "analytics" | "campaigns" | "integrations" | "settings" | "team";

export const teamPermissions: Record<ServerTeamRole, readonly ServerPermission[]> = {
  ADMIN: ["analytics", "campaigns", "integrations", "settings", "team"],
  MANAGER: ["analytics", "campaigns"],
  OPERATOR: ["integrations", "settings"],
  ANALYST: ["analytics"],
};

export const canAccessServer = (
  ownerId: string,
  userId: string,
  role: ServerTeamRole | undefined,
  permission: ServerPermission,
) => ownerId === userId || Boolean(role && teamPermissions[role].includes(permission));

export const allowsPlayerMilestoneSubmission = (verificationMethod: string) =>
  verificationMethod === "MANUAL" ||
  verificationMethod === "WEB_EVENT" ||
  verificationMethod === "CLIENT_MOD";

const knownSnapshotMetrics = new Set([
  "SKYBLOCK_LEVEL",
  "ISLAND_WORTH",
  "LIFESTEAL_HEARTS",
  "SKILL_LEVEL",
]);

export const validatePluginEvent = (
  input: {
    instanceId: string;
    type: string;
    occurredAt: string;
    minecraftUuid: string;
    metadata: Record<string, unknown>;
  },
  options: {
    boundInstanceId: string | null;
    advertisedMetrics: readonly string[];
    now?: Date;
  },
) => {
  if (!options.boundInstanceId || input.instanceId !== options.boundInstanceId) {
    throw new Error("Plugin instance verification is required before sending events.");
  }
  const now = options.now ?? new Date();
  const occurredAt = new Date(input.occurredAt);
  if (
    !Number.isFinite(occurredAt.getTime()) ||
    occurredAt.getTime() > now.getTime() + 5 * 60_000 ||
    occurredAt.getTime() < now.getTime() - 24 * 60 * 60_000
  ) {
    throw new Error("Plugin event timestamp is outside the accepted delivery window.");
  }

  const metadata = { ...input.metadata };
  if (input.type === "PLAYER_KILL") {
    const victimUuid = String(metadata.victimUuid ?? "");
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(victimUuid)) {
      throw new Error("Plugin event requires a valid victim UUID.");
    }
    if (victimUuid.toLowerCase() === input.minecraftUuid.toLowerCase()) {
      throw new Error("Plugin event cannot record a player defeating themselves.");
    }
  }
  if (input.type === "PLAYTIME") {
    const seconds = Number(metadata.seconds);
    if (!Number.isFinite(seconds) || seconds < 1 || seconds > 86_400) {
      throw new Error("Plugin event playtime is outside the accepted range.");
    }
    metadata.seconds = Math.floor(seconds);
  }
  if (input.type === "METRIC_SNAPSHOT") {
    const metric = String(metadata.metric ?? "").toUpperCase();
    const value = Number(metadata.value);
    if (
      !knownSnapshotMetrics.has(metric) ||
      !options.advertisedMetrics.includes(metric) ||
      !Number.isFinite(value) ||
      value < 0 ||
      value > 1_000_000_000_000
    ) {
      throw new Error("Plugin metric is not an accepted advertised capability.");
    }
    metadata.metric = metric;
    metadata.value = value;
  }
  return { occurredAt, metadata };
};
