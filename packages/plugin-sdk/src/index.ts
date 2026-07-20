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
