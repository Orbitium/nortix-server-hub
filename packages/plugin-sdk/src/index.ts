import { z } from "zod";

export const IntegrationEventSchema = z.object({
  id: z.string().min(8),
  type: z.string().min(1).max(120),
  occurredAt: z.string().datetime(),
  serverId: z.string().min(1),
  campaignId: z.string().optional(),
  participationId: z.string().optional(),
  minecraftUuid: z.string().uuid().optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export type IntegrationEvent = z.infer<typeof IntegrationEventSchema>;

export type SignedIntegrationRequest = {
  serverId: string;
  keyId: string;
  timestamp: string;
  nonce: string;
  signature: string;
  idempotencyKey: string;
};

export const PluginCredentialResponseSchema = z.object({
  serverId: z.string().min(1),
  serverName: z.string().min(1),
  keyId: z.string().min(8),
  algorithm: z.literal("ECDSA_P256_SHA256"),
  privateKey: z.string().regex(/^p256_[A-Za-z0-9_-]{40,50}$/),
  publicKey: z.string().regex(/^p256_[A-Za-z0-9_-]{40,50}\.[A-Za-z0-9_-]{40,50}$/),
  shownOnce: z.literal(true),
});

export type PluginCredentialResponse = z.infer<typeof PluginCredentialResponseSchema>;

export type CampaignIntegrationConfig = {
  campaignId: string;
  serverId: string;
  milestones: Array<{
    id: string;
    type: string;
    verificationMethod: string;
    config: Record<string, unknown>;
  }>;
};

export const VerificationPlatformSchema = z.enum(["PAPER", "VELOCITY"]);
export type VerificationPlatform = z.infer<typeof VerificationPlatformSchema>;

export const CreateServerVerificationSchema = z.object({
  platform: VerificationPlatformSchema,
});

export const PluginVerificationHandshakeSchema = z.object({
  code: z.string().regex(/^NORTIX-[A-Z0-9]{4}-[A-Z0-9]{4}$/i),
  platform: VerificationPlatformSchema,
  pluginVersion: z.string().min(1).max(40),
  publicAddress: z.string().min(3).max(300).optional(),
});

export const PluginVerificationStatusSchema = z.object({
  code: z.string().regex(/^NORTIX-[A-Z0-9]{4}-[A-Z0-9]{4}$/i),
  platform: VerificationPlatformSchema,
});

export const milestoneCapabilityKinds = [
  "PLAYER_KILLS",
  "UNIQUE_PLAYER_KILLS",
  "MOB_KILLS",
  "BLOCKS_BROKEN",
  "PLAYTIME_SECONDS",
  "SKYBLOCK_LEVEL",
  "ISLAND_WORTH",
  "LIFESTEAL_HEARTS",
  "PVP_STREAK",
  "SKILL_LEVEL",
] as const;

export const PluginCapabilitySchema = z.object({
  id: z.string().min(2).max(80),
  provider: z.string().min(2).max(80),
  category: z.enum(["CORE", "PVP", "LIFESTEAL", "SKYBLOCK", "SKILLS"]),
  metrics: z.array(z.enum(milestoneCapabilityKinds)).min(1),
  version: z.string().max(40).optional(),
  available: z.boolean().default(true),
});

export const PluginCapabilitiesHandshakeSchema = z.object({
  serverId: z.string().min(1),
  instanceId: z.string().min(8).max(100),
  platform: z.literal("PAPER"),
  pluginVersion: z.string().min(1).max(40),
  proxyServerName: z.string().max(80).optional(),
  capabilities: z.array(PluginCapabilitySchema).min(1).max(32),
});

export const ServerPluginEventSchema = z.object({
  id: z.string().min(8).max(100),
  serverId: z.string().min(1),
  instanceId: z.string().min(8).max(100),
  type: z.enum(["PLAYER_JOIN", "PLAYER_KILL", "MOB_KILL", "BLOCK_BREAK", "PLAYTIME", "METRIC_SNAPSHOT"]),
  occurredAt: z.string().datetime(),
  minecraftUuid: z.string().uuid(),
  minecraftUsername: z.string().regex(/^[A-Za-z0-9_]{3,16}$/),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export const PluginPlayerHistorySchema = z.object({
  serverId: z.string().min(1),
  instanceId: z.string().min(8).max(100),
  complete: z.boolean(),
  players: z.array(z.object({
    minecraftUsername: z.string().regex(/^[A-Za-z0-9_]{3,16}$/),
    firstSeenAt: z.string().datetime(),
  })).max(500),
});

export const PluginPresenceSnapshotSchema = z
  .object({
    id: z.string().min(8).max(100),
    serverId: z.string().min(1),
    instanceId: z.string().min(8).max(100),
    platform: z.enum(["PAPER", "VELOCITY"]),
    pluginVersion: z.string().min(1).max(40),
    serverVersion: z.string().min(1).max(80).optional(),
    observedAt: z.string().datetime(),
    onlinePlayers: z.number().int().min(0).max(100_000),
    maxPlayers: z.number().int().min(0).max(100_000).optional(),
    players: z
      .array(
        z.object({
          minecraftUuid: z.string().uuid(),
          backend: z.string().min(1).max(80).optional(),
        }),
      )
      .max(10_000),
  })
  .superRefine((value, context) => {
    if (value.players.length !== value.onlinePlayers) {
      context.addIssue({
        code: "custom",
        path: ["players"],
        message: "The privacy-minimized roster must match the reported online player count.",
      });
    }
  });

export const PluginStoreDeliveryQuerySchema = z.object({
  serverId: z.string().min(1),
});

export const PluginStoreDeliveryResultSchema = z
  .object({
    serverId: z.string().min(1),
    deliveryId: z.string().min(8).max(120),
    success: z.boolean(),
    error: z.string().trim().min(1).max(1_000).optional(),
  })
  .strict()
  .refine((value) => value.success || Boolean(value.error), {
    message: "A failed delivery must include an error.",
    path: ["error"],
  });

export const PluginStoreDeliverySchema = z.object({
  id: z.string().min(8),
  purchaseId: z.string().min(8),
  commands: z.array(z.string().min(1).max(500)).min(1).max(10),
});

export type PluginCapability = z.infer<typeof PluginCapabilitySchema>;
