import { z } from "zod";

export const userRoles = ["PLAYER", "SERVER_OWNER", "MODERATOR", "ADMIN"] as const;
export const UserRoleSchema = z.enum(userRoles);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const permissions = [
  "campaign:create",
  "campaign:review",
  "campaign:publish",
  "server:manage",
  "reward:approve",
  "withdrawal:request",
  "withdrawal:review",
  "user:suspend",
  "ledger:view_internal",
] as const;
export type Permission = (typeof permissions)[number];

export const rolePermissions: Record<UserRole, readonly Permission[]> = {
  PLAYER: ["withdrawal:request"],
  SERVER_OWNER: ["campaign:create", "server:manage"],
  MODERATOR: ["campaign:review", "campaign:publish", "reward:approve", "withdrawal:review"],
  ADMIN: permissions,
};

export const campaignStatuses = [
  "DRAFT",
  "SUBMITTED",
  "UNDER_REVIEW",
  "CHANGES_REQUESTED",
  "APPROVED",
  "SCHEDULED",
  "ACTIVE",
  "PAUSED",
  "COMPLETED",
  "REJECTED",
  "ARCHIVED",
] as const;
export const CampaignStatusSchema = z.enum(campaignStatuses);

export const milestoneTypes = [
  "JOIN_SERVER",
  "ACTIVE_DURATION",
  "COMPLETE_TUTORIAL",
  "REACH_LEVEL",
  "REACH_REGION",
  "EARN_ACHIEVEMENT",
  "DEFEAT_BOSS",
  "COMPLETE_QUEST",
  "RETURN_ANOTHER_DAY",
  "SUBMIT_FEEDBACK",
  "SUBMIT_BUG_REPORT",
  "JOIN_COMMUNITY",
  "CUSTOM_MANUAL",
] as const;
export const MilestoneTypeSchema = z.enum(milestoneTypes);

export const ServerInputSchema = z.object({
  name: z.string().min(3).max(80),
  hostname: z.string().min(3).max(255),
  port: z.number().int().min(1).max(65535).default(25565),
  description: z.string().min(30).max(3000),
  edition: z.enum(["JAVA", "BEDROCK"]),
  versions: z.array(z.string()).min(1),
  categories: z.array(z.string()).min(1).max(6),
  tags: z.array(z.string()).max(12).default([]),
  verificationParentId: z.string().min(1).optional(),
  websiteUrl: z.string().url().optional(),
  discordUrl: z.string().url().optional(),
});

export const CampaignMilestoneInputSchema = z.object({
  templateType: MilestoneTypeSchema,
  title: z.string().min(3).max(100),
  instructions: z.string().min(10).max(1000),
  rewardCents: z.number().int().min(0).max(10_000),
  sparksReward: z.number().int().min(0).max(50_000),
  verificationMethod: z.enum(["MANUAL", "WEB_EVENT", "SERVER_PLUGIN", "CLIENT_MOD", "API"]),
  config: z.record(z.string(), z.unknown()).default({}),
});

export const CampaignInputSchema = z
  .object({
    serverId: z.string().min(1),
    title: z.string().min(6).max(120),
    description: z.string().min(30).max(4000),
    category: z.string().min(2).max(40),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    maxParticipants: z.number().int().min(1).max(100_000),
    regionRestrictions: z.array(z.string()).default([]),
    versionRequirements: z.array(z.string()).default([]),
    milestones: z.array(CampaignMilestoneInputSchema).min(1).max(12),
  })
  .refine((value) => value.endsAt > value.startsAt, {
    message: "Campaign end must be after its start",
    path: ["endsAt"],
  });

export const JoinCampaignSchema = z.object({
  acceptedTerms: z.literal(true),
  minecraftIdentityId: z.string().optional(),
});

export const MilestoneSubmissionSchema = z.object({
  evidence: z.record(z.string(), z.unknown()).default({}),
  note: z.string().max(2000).optional(),
});

export const WithdrawalInputSchema = z.object({
  amountCents: z.number().int().min(1000),
  currency: z.literal("USD").default("USD"),
  payoutProvider: z.string().min(2).max(30),
  payoutDestinationReference: z.string().min(4).max(255),
});

export const AnalyticsEventSchema = z.object({
  id: z.string().min(8),
  userId: z.string().optional(),
  serverId: z.string().optional(),
  campaignId: z.string().optional(),
  participationId: z.string().optional(),
  source: z.enum(["WEB", "MANUAL", "SERVER_PLUGIN", "CLIENT_MOD", "API"]),
  type: z.string().min(1).max(120),
  occurredAt: z.coerce.date(),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export type CampaignInput = z.infer<typeof CampaignInputSchema>;
export type ServerInput = z.infer<typeof ServerInputSchema>;
export type WithdrawalInput = z.infer<typeof WithdrawalInputSchema>;

export type ApiError = {
  code: string;
  message: string;
  requestId?: string;
  details?: unknown;
};

export const formatMoney = (cents: number, currency = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);

export const formatNumber = (value: number) => new Intl.NumberFormat("en-US").format(value);
