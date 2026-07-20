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
  keyId: string;
  timestamp: string;
  nonce: string;
  signature: string;
  idempotencyKey: string;
};

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
  type: z.enum(["PLAYER_KILL", "MOB_KILL", "BLOCK_BREAK", "PLAYTIME", "METRIC_SNAPSHOT"]),
  occurredAt: z.string().datetime(),
  minecraftUuid: z.string().uuid(),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export type PluginCapability = z.infer<typeof PluginCapabilitySchema>;
