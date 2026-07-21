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
  "message:send",
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
  serverValidationSignature: z.string().min(20).max(500).optional(),
});

export const ServerAddressValidationSchema = z.object({
  hostname: z.string().trim().min(3).max(255),
  port: z.number().int().min(1).max(65535).default(25565),
  edition: z.enum(["JAVA", "BEDROCK"]).default("JAVA"),
});

export const serverTeamRoles = ["ADMIN", "MANAGER", "OPERATOR", "ANALYST"] as const;
export const ServerTeamRoleSchema = z.enum(serverTeamRoles);
export type ServerTeamRole = z.infer<typeof ServerTeamRoleSchema>;

export const ServerTeamInviteInputSchema = z.object({
  username: z.string().trim().min(2).max(32),
  role: ServerTeamRoleSchema,
});

export const TeamInviteResponseSchema = z.object({
  action: z.enum(["ACCEPT", "DECLINE"]),
});

export const TeamMemberRoleInputSchema = z.object({ role: ServerTeamRoleSchema });

export const NotificationPreferenceInputSchema = z
  .object({
    campaignActivity: z.boolean(),
    questsAndStreaks: z.boolean(),
    sparksActivity: z.boolean(),
    serverOperations: z.boolean(),
    teamActivity: z.boolean(),
    productUpdates: z.boolean(),
    emailProductUpdates: z.boolean(),
  })
  .strict();

const SafeInternalActionUrlSchema = z
  .string()
  .trim()
  .max(500)
  .refine((value) => value.startsWith("/") && !value.startsWith("//"), {
    message: "Action URL must be an internal path.",
  });

export const AdminMessageInputSchema = z
  .object({
    audience: z.enum(["ALL_USERS", "PLAYERS", "SERVER_OWNERS", "LIMITED_ACCOUNTS", "USER"]),
    targetUsername: z.string().trim().min(2).max(32).optional(),
    severity: z.enum(["INFO", "SUCCESS", "WARNING", "CRITICAL"]).default("INFO"),
    status: z.enum(["DRAFT", "SENT"]),
    title: z.string().trim().min(3).max(100),
    body: z.string().trim().min(10).max(2_000),
    actionUrl: SafeInternalActionUrlSchema.optional(),
  })
  .strict()
  .refine((value) => value.audience !== "USER" || Boolean(value.targetUsername), {
    message: "A target username is required for a direct message.",
    path: ["targetUsername"],
  })
  .refine((value) => value.audience === "USER" || !value.targetUsername, {
    message: "A target username is only allowed for a direct message.",
    path: ["targetUsername"],
  });

export const CampaignMilestoneInputSchema = z.object({
  templateType: MilestoneTypeSchema,
  title: z.string().trim().min(3).max(72),
  instructions: z.string().trim().min(10).max(240),
  rewardCents: z.literal(0).default(0),
  verificationMethod: z.enum(["MANUAL", "WEB_EVENT", "SERVER_PLUGIN", "CLIENT_MOD", "API"]),
  config: z.record(z.string(), z.unknown()).default({}),
});

export const CampaignInputSchema = z
  .object({
    serverId: z.string().min(1),
    title: z.string().trim().min(6).max(64),
    description: z.string().trim().min(30).max(320),
    category: z.string().min(2).max(40),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    budgetCredits: z.number().int().min(100).max(10_000_000),
    sparksRewardRange: z.object({
      minimum: z.number().int().min(5).max(2_000),
      maximum: z.number().int().min(10).max(2_000),
    }),
    regionRestrictions: z.array(z.string()).default([]),
    versionRequirements: z.array(z.string()).default([]),
    milestones: z.array(CampaignMilestoneInputSchema).min(1).max(8),
  })
  .refine((value) => value.endsAt > value.startsAt, {
    message: "Campaign end must be after its start",
    path: ["endsAt"],
  })
  .refine((value) => value.sparksRewardRange.maximum >= value.sparksRewardRange.minimum, {
    message: "Maximum Sparks must be greater than or equal to minimum Sparks",
    path: ["sparksRewardRange", "maximum"],
  })
  .refine(
    (value) => {
      const automatic = value.milestones.filter((milestone) =>
        ["SERVER_PLUGIN", "WEB_EVENT", "API"].includes(milestone.verificationMethod),
      ).length;
      const manual = value.milestones.length - automatic;
      return automatic > manual;
    },
    {
      message: "Most campaign milestones must use automatic system verification",
      path: ["milestones"],
    },
  )
  .refine((value) => value.sparksRewardRange.maximum >= value.milestones.length, {
    message: "Maximum Sparks must allow at least one Spark per milestone",
    path: ["sparksRewardRange", "maximum"],
  })
  .refine(
    (value) => {
      const estimatedCost =
        10 + Math.ceil(value.sparksRewardRange.maximum / 10) + value.milestones.length * 3;
      return value.budgetCredits >= estimatedCost * 10;
    },
    {
      message: "Campaign budget must support at least ten potential participants",
      path: ["budgetCredits"],
    },
  );

export const JoinCampaignSchema = z
  .object({
    acceptedTerms: z.literal(true),
    minecraftIdentityId: z.string().optional(),
    crackedAccountLinkId: z.string().optional(),
  })
  .refine(
    (value) => !(value.minecraftIdentityId && value.crackedAccountLinkId),
    "Choose either a premium identity or a server-scoped cracked account.",
  );

export const CrackedAccountClaimSchema = z.object({
  serverId: z.string().min(1),
  minecraftUsername: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9_]{3,16}$/),
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
