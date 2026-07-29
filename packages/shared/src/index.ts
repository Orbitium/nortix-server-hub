import { z } from "zod";

export const userRoles = ["PLAYER", "SERVER_OWNER", "MODERATOR", "ADMIN"] as const;
export const UserRoleSchema = z.enum(userRoles);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const permissions = [
  "campaign:create",
  "campaign:review",
  "campaign:publish",
  "campaign:admin_create",
  "campaign:terminate",
  "server:manage",
  "server:moderate",
  "reward:approve",
  "user:suspend",
  "message:send",
  "ledger:view_internal",
  "sparks:manage",
  "sponsored_shop:manage",
  "sponsored_purchase:fulfill",
] as const;
export type Permission = (typeof permissions)[number];

export const minecraftMajorVersions = [
  "1.8",
  "1.9",
  "1.10",
  "1.11",
  "1.12",
  "1.13",
  "1.14",
  "1.15",
  "1.16",
  "1.17",
  "1.18",
  "1.19",
  "1.20",
  "1.21",
] as const;
export const MinecraftMajorVersionSchema = z.enum(minecraftMajorVersions);

const minecraftVersionPattern = /(?<![\d.])1\.\d{1,2}(?:\.\d{1,3})?(?!\d|\.\d)/g;
const minecraftVersionCollator = new Intl.Collator("en", {
  numeric: true,
  sensitivity: "base",
});

export function extractMinecraftVersions(value: string) {
  return value.match(minecraftVersionPattern) ?? [];
}

export function normalizeMinecraftVersions(values: readonly string[]) {
  return [...new Set(values.flatMap(extractMinecraftVersions))].sort(
    minecraftVersionCollator.compare,
  );
}

export const serverTypes = [
  "Survival",
  "SMP",
  "Skyblock",
  "Factions",
  "Prison",
  "PvP",
  "Lifesteal",
  "BedWars",
  "SkyWars",
  "KitPvP",
  "Anarchy",
  "Creative",
  "RPG",
  "Minigames",
  "Hardcore",
] as const;
export const ServerTypeSchema = z.enum(serverTypes);

export const rolePermissions: Record<UserRole, readonly Permission[]> = {
  PLAYER: [],
  SERVER_OWNER: ["campaign:create", "server:manage"],
  MODERATOR: ["campaign:review", "campaign:publish", "reward:approve"],
  ADMIN: permissions,
};

export const AdminEnrollmentInputSchema = z
  .object({
    token: z
      .string()
      .trim()
      .min(1)
      .max(200)
      .regex(/^nortix_admin_[A-Za-z0-9_-]{43}$/),
  })
  .strict();

export type AdminEnrollmentInput = z.infer<typeof AdminEnrollmentInputSchema>;

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
  "TERMINATED",
] as const;
export const CampaignStatusSchema = z.enum(campaignStatuses);

export const campaignFundingSources = ["OWNER_CREDITS", "NORTIX_SPONSORED"] as const;
export const CampaignFundingSourceSchema = z.enum(campaignFundingSources);

export const campaignTerminationRefundPolicies = [
  "REFUND_ALL",
  "REFUND_UNUSED",
  "NO_REFUND",
] as const;
export const CampaignTerminationRefundPolicySchema = z.enum(campaignTerminationRefundPolicies);

export const cosmeticTypes = ["AVATAR", "BANNER", "BADGE", "TITLE", "THEME"] as const;
export const CosmeticTypeSchema = z.enum(cosmeticTypes);
export const cosmeticUnlockMethods = ["DEFAULT", "LEVEL", "SPARKS"] as const;
export const CosmeticUnlockMethodSchema = z.enum(cosmeticUnlockMethods);

export const EquipCosmeticInputSchema = z
  .object({
    itemId: z.string().min(1).max(120),
  })
  .strict();

export const UnequipCosmeticInputSchema = z
  .object({
    type: CosmeticTypeSchema,
  })
  .strict();

export const ClaimReferralInviteInputSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^NFX-[A-Z0-9]{4}-[A-Z0-9]{4}$/),
  })
  .strict();

export type ClaimReferralInviteInput = z.infer<typeof ClaimReferralInviteInputSchema>;

export const maxFriendReferralInvitesPerMonth = 10;
export const friendReferralEarningWindowDays = 30;

export const SponsoredFulfillmentFieldSchema = z.enum([
  "MINECRAFT_USERNAME",
  "DISCORD_USERNAME",
  "EMAIL",
]);
export const storeItemCategories = [
  "RANKS",
  "COINS",
  "CRATES",
  "COSMETICS",
  "BOOSTERS",
  "SUBSCRIPTIONS",
  "BUNDLES",
  "OTHER",
] as const;
export const StoreItemCategorySchema = z.enum(storeItemCategories);
export const storeItemCategoryLabels: Record<(typeof storeItemCategories)[number], string> = {
  RANKS: "Ranks",
  COINS: "Coins",
  CRATES: "Crates",
  COSMETICS: "Cosmetics",
  BOOSTERS: "Boosters",
  SUBSCRIPTIONS: "Subscriptions",
  BUNDLES: "Bundles",
  OTHER: "Other",
};
const SponsoredSlugSchema = z
  .string()
  .trim()
  .min(2)
  .max(64)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

const AdminSponsoredStoreShape = {
  slug: SponsoredSlugSchema,
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().min(10).max(500),
  websiteUrl: z.string().url().max(2_000).optional(),
  logoUrl: z.string().url().max(2_000).optional(),
  available: z.boolean(),
  sortOrder: z.number().int().min(-10_000).max(10_000),
};

export const AdminSponsoredStoreInputSchema = z
  .object({
    ...AdminSponsoredStoreShape,
    available: AdminSponsoredStoreShape.available.default(true),
    sortOrder: AdminSponsoredStoreShape.sortOrder.default(0),
  })
  .strict();

export const AdminSponsoredStoreUpdateSchema = z.object(AdminSponsoredStoreShape).partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, "At least one store field is required.");

const AdminSponsoredItemShape = {
  slug: SponsoredSlugSchema,
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().min(10).max(1_000),
  category: StoreItemCategorySchema,
  sparksPrice: z.number().int().min(1).max(1_000_000),
  imageUrl: z.string().url().max(2_000).optional(),
  fulfillmentSummary: z.string().trim().min(5).max(300),
  fulfillmentFields: z
    .array(SponsoredFulfillmentFieldSchema)
    .max(3)
    .refine((fields) => new Set(fields).size === fields.length, "Delivery fields must be unique."),
  available: z.boolean(),
  sortOrder: z.number().int().min(-10_000).max(10_000),
};

export const AdminSponsoredItemInputSchema = z
  .object({
    ...AdminSponsoredItemShape,
    category: AdminSponsoredItemShape.category.default("OTHER"),
    fulfillmentFields: AdminSponsoredItemShape.fulfillmentFields.default([]),
    available: AdminSponsoredItemShape.available.default(true),
    sortOrder: AdminSponsoredItemShape.sortOrder.default(0),
  })
  .strict();

export const AdminSponsoredItemUpdateSchema = z.object(AdminSponsoredItemShape).partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, "At least one item field is required.");

export const maxSponsoredPurchaseQuantity = 10;

export const SponsoredPurchaseInputSchema = z
  .object({
    itemId: z.string().min(1).max(120),
    idempotencyKey: z.string().uuid(),
    quantity: z.number().int().min(1).max(maxSponsoredPurchaseQuantity).default(1),
    fulfillmentDetails: z
      .object({
        minecraftUsername: z.string().trim().regex(/^[A-Za-z0-9_]{3,16}$/).optional(),
        discordUsername: z.string().trim().min(2).max(64).optional(),
        email: z.string().trim().email().max(320).optional(),
      })
      .strict()
      .default({}),
  })
  .strict();

export const AdminSponsoredPurchaseActionSchema = z
  .object({
    action: z.enum(["START_PROCESSING", "MARK_DELIVERED", "CANCEL", "REFUND", "CANCEL_AND_REFUND"]),
    reason: z.string().trim().min(5).max(1_000).optional(),
    deliveryReference: z.string().trim().min(1).max(2_000).optional(),
    adminNote: z.string().trim().max(2_000).optional(),
    confirmation: z.literal("CONFIRM"),
  })
  .strict()
  .refine(
    (value) => value.action !== "MARK_DELIVERED" || Boolean(value.deliveryReference),
    { message: "A private delivery reference is required.", path: ["deliveryReference"] },
  )
  .refine(
    (value) =>
      !["CANCEL", "REFUND", "CANCEL_AND_REFUND"].includes(value.action) ||
      Boolean(value.reason),
    { message: "A reason is required for cancellation or refund.", path: ["reason"] },
  );

export const serverStoreCommandPlaceholders = [
  "%player%",
  "%amount%",
  "%quantity%",
  "%purchase_id%",
  "%item_id%",
  "%buyer%",
  "%recipient%",
] as const;

const ServerStoreImageUrlSchema = z
  .string()
  .max(2_000)
  .refine((value) => {
    if (/^\/api\/v1\/media\/store-items\/[0-9a-f-]{36}\.(?:png|jpe?g|webp)$/i.test(value)) {
      return true;
    }
    try {
      return new URL(value).protocol === "https:";
    } catch {
      return false;
    }
  }, "Store images must be an uploaded Nortix asset or use HTTPS.");

export const ServerStoreItemStatusSchema = z.enum(["DRAFT", "PUBLISHED", "UNPUBLISHED"]);

const ServerStoreCommandTemplateSchema = z
  .string()
  .trim()
  .min(1)
  .max(500)
  .refine(
    (value) => ![...value].some((character) => {
      const code = character.charCodeAt(0);
      return code <= 31 || code === 127;
    }),
    "Commands must be one line.",
  )
  .refine(
    (value) =>
      [...value.matchAll(/%[^%\s]+%/g)].every((match) =>
        (serverStoreCommandPlaceholders as readonly string[]).includes(match[0].toLowerCase()),
      ),
    "A command contains an unsupported placeholder.",
  );

export const OwnerServerStoreInputSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    description: z.string().trim().min(10).max(500),
    logoUrl: ServerStoreImageUrlSchema.optional(),
    available: z.boolean().default(false),
  })
  .strict();

const OwnerServerStoreItemShape = {
  slug: SponsoredSlugSchema,
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().min(10).max(1_000),
  category: StoreItemCategorySchema,
  sparksPrice: z.number().int().min(1).max(1_000_000),
  imageUrls: z
    .array(ServerStoreImageUrlSchema)
    .max(6)
    .refine((urls) => new Set(urls).size === urls.length, "Item images must be unique."),
  stockQuantity: z.number().int().min(0).max(10_000_000).nullable(),
  maxPerPurchase: z.number().int().min(1).max(100),
  commandTemplates: z.array(ServerStoreCommandTemplateSchema).min(1).max(10),
  status: ServerStoreItemStatusSchema,
  sortOrder: z.number().int().min(-10_000).max(10_000),
};

export const OwnerServerStoreItemInputSchema = z
  .object({
    ...OwnerServerStoreItemShape,
    category: OwnerServerStoreItemShape.category.default("OTHER"),
    stockQuantity: OwnerServerStoreItemShape.stockQuantity.default(null),
    maxPerPurchase: OwnerServerStoreItemShape.maxPerPurchase.default(1),
    status: OwnerServerStoreItemShape.status.default("DRAFT"),
    sortOrder: OwnerServerStoreItemShape.sortOrder.default(0),
  })
  .strict();

export const OwnerServerStoreItemUpdateSchema = z.object(OwnerServerStoreItemShape).partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, "At least one item field is required.");

export const ServerStorePurchaseInputSchema = z
  .object({
    itemId: z.string().min(1).max(120),
    idempotencyKey: z.string().uuid(),
    quantity: z.number().int().min(1).max(100).default(1),
    recipientUsername: z
      .string()
      .trim()
      .min(3)
      .max(32)
      .regex(/^[A-Za-z0-9_]+$/)
      .optional(),
    giftMessage: z.string().trim().max(300).optional(),
  })
  .strict();

export const ServerStorePurchaseMutationSchema = z
  .object({
    idempotencyKey: z.string().uuid(),
  })
  .strict();

export const OwnerServerStorePayoutInputSchema = z
  .object({
    amountCents: z.number().int().min(1_000).max(100_000_000),
    idempotencyKey: z.string().uuid(),
  })
  .strict();

export const AdminServerStorePayoutProfileInputSchema = z
  .object({
    ownerUsername: z.string().trim().min(3).max(32).regex(/^[A-Za-z0-9_]+$/),
    provider: z.string().trim().min(2).max(40),
    providerAccountReference: z.string().trim().min(4).max(500),
    displayLabel: z.string().trim().min(2).max(80),
    verified: z.boolean(),
  })
  .strict();

export const AdminServerStorePayoutActionSchema = z
  .object({
    action: z.enum(["UNDER_REVIEW", "APPROVE", "MARK_PROCESSING", "MARK_PAID", "REJECT", "FAIL"]),
    reason: z.string().trim().min(5).max(1_000),
    providerReference: z.string().trim().min(4).max(500).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.action === "MARK_PAID" && !value.providerReference) {
      context.addIssue({
        code: "custom",
        path: ["providerReference"],
        message: "A provider reference is required before marking a request paid.",
      });
    }
  });

export const milestoneTypes = [
  "JOIN_SERVER",
  "JOIN_DAILY",
  "JOIN_WEEKLY",
  "ACTIVE_DURATION",
  "PLAYTIME_TOTAL",
  "JOIN_DISCORD",
  "VOTE_SERVER",
  "SERVER_REVIEW",
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
  edition: z.literal("JAVA"),
  versions: z.array(z.string()).min(1),
  categories: z.array(z.string()).min(1).max(6),
  tags: z.array(z.string()).max(12).default([]),
  maxPlayers: z.number().int().min(1).max(1_000_000).optional(),
  bannerUrl: z
    .string()
    .url()
    .max(2_000)
    .refine((value) => ["http:", "https:"].includes(new URL(value).protocol), {
      message: "Banner URL must use HTTP or HTTPS.",
    })
    .optional(),
  verificationParentId: z.string().min(1).optional(),
  websiteUrl: z.string().url().optional(),
  discordUrl: z.string().url().optional(),
  serverValidationSignature: z.string().min(20).max(500).optional(),
});

export const ServerAddressValidationSchema = z.object({
  hostname: z.string().trim().min(3).max(255),
  port: z.number().int().min(1).max(65535).default(25565),
  edition: z.literal("JAVA").default("JAVA"),
});

export const DeleteServerRegistrationSchema = z
  .object({
    confirmationName: z.string().trim().min(1).max(80),
    reason: z.string().trim().min(5).max(500),
  })
  .strict();

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
  verificationMethod: z.enum(["MANUAL", "WEB_EVENT", "SERVER_PLUGIN", "CLIENT_MOD", "API"]),
  config: z.record(z.string(), z.unknown()).default({}),
});

export const ServerVoteInputSchema = z
  .object({
    vote: z.literal(true).default(true),
    turnstileToken: z.string().trim().min(1).max(2_048),
  })
  .strict();
export const RewardedVoteSessionInputSchema = z
  .object({
    turnstileToken: z.string().trim().min(1).max(2_048),
  })
  .strict();
export const RewardedVoteSessionGrantSchema = z.object({
  token: z.string().min(32).max(200),
}).strict();
export const ServerRewardedVotingSettingSchema = z.object({
  rewardedVotingEnabled: z.boolean(),
}).strict();
export const ServerReviewInputSchema = z.object({
  rating: z.number().int().min(1).max(5),
  text: z.string().trim().min(3).max(1_000),
});

const CampaignConfigurationShape = {
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
  milestones: z
    .array(CampaignMilestoneInputSchema)
    .length(1, "A campaign must have exactly one milestone"),
};

type CampaignConfiguration = z.infer<z.ZodObject<typeof CampaignConfigurationShape>>;

const validateCampaignConfiguration = (
  value: CampaignConfiguration,
  context: z.RefinementCtx,
) => {
  if (value.endsAt <= value.startsAt) {
    context.addIssue({
      code: "custom",
      message: "Campaign end must be after its start",
      path: ["endsAt"],
    });
  }
  if (value.sparksRewardRange.maximum < value.sparksRewardRange.minimum) {
    context.addIssue({
      code: "custom",
      message: "Maximum Sparks must be greater than or equal to minimum Sparks",
      path: ["sparksRewardRange", "maximum"],
    });
  }
  const automatic = value.milestones.filter((milestone) =>
    ["SERVER_PLUGIN", "WEB_EVENT", "API"].includes(milestone.verificationMethod),
  ).length;
  if (automatic <= value.milestones.length - automatic) {
    context.addIssue({
      code: "custom",
      message: "Most campaign milestones must use automatic system verification",
      path: ["milestones"],
    });
  }
  if (value.sparksRewardRange.maximum < value.milestones.length) {
    context.addIssue({
      code: "custom",
      message: "Maximum Sparks must allow at least one Spark per milestone",
      path: ["sparksRewardRange", "maximum"],
    });
  }
  const estimatedCost =
    10 + Math.ceil(value.sparksRewardRange.maximum / 10) + value.milestones.length * 3;
  if (value.budgetCredits < estimatedCost * 10) {
    context.addIssue({
      code: "custom",
      message: "Campaign budget must support at least ten potential participants",
      path: ["budgetCredits"],
    });
  }
};

export const CampaignInputSchema = z
  .object({
    serverId: z.string().min(1),
    ...CampaignConfigurationShape,
  })
  .superRefine(validateCampaignConfiguration);

export const AdminSponsoredCampaignInputSchema = z
  .object({
    target: z
      .object({
        serverId: z.string().min(1).optional(),
        address: ServerAddressValidationSchema.optional(),
      })
      .strict()
      .refine((target) => Boolean(target.serverId || target.address), {
        message: "Select a verified Nortix server or enter its public server address.",
      }),
    ...CampaignConfigurationShape,
  })
  .superRefine(validateCampaignConfiguration);

export const AdminCampaignTerminationInputSchema = z
  .object({
    refundPolicy: CampaignTerminationRefundPolicySchema,
    reason: z.string().trim().max(2_000).optional(),
    confirmation: z.string().min(1).max(200),
  })
  .strict();

export const AdminSparksAdjustmentInputSchema = z
  .object({
    userId: z.string().min(1).max(200),
    direction: z.enum(["CREDIT", "DEBIT"]),
    amount: z.number().int().min(1).max(1_000_000),
    description: z.string().trim().min(5).max(500),
    idempotencyKey: z.string().uuid(),
  })
  .strict();

export const AdminUserStatusActionSchema = z
  .object({
    action: z.enum(["ACTIVATE", "FREEZE", "UNDER_REVIEW", "SUSPEND", "BAN"]),
    reason: z.string().trim().min(5).max(1_000),
    confirmation: z.string().min(1).max(200),
  })
  .strict();

export const AdminServerStatusActionSchema = z
  .object({
    action: z.enum(["APPROVE", "FLAG", "HIDE", "REJECT", "RESTORE"]),
    reason: z.string().trim().min(5).max(1_000),
    confirmation: z.string().min(1).max(200),
  })
  .strict();

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
export type AdminSponsoredCampaignInput = z.infer<typeof AdminSponsoredCampaignInputSchema>;
export type AdminCampaignTerminationInput = z.infer<typeof AdminCampaignTerminationInputSchema>;
export type AdminSparksAdjustmentInput = z.infer<typeof AdminSparksAdjustmentInputSchema>;
export type AdminUserStatusAction = z.infer<typeof AdminUserStatusActionSchema>;
export type AdminServerStatusAction = z.infer<typeof AdminServerStatusActionSchema>;
export type CosmeticType = z.infer<typeof CosmeticTypeSchema>;
export type CosmeticUnlockMethod = z.infer<typeof CosmeticUnlockMethodSchema>;
export type EquipCosmeticInput = z.infer<typeof EquipCosmeticInputSchema>;
export type UnequipCosmeticInput = z.infer<typeof UnequipCosmeticInputSchema>;
export type AdminSponsoredStoreInput = z.infer<typeof AdminSponsoredStoreInputSchema>;
export type AdminSponsoredStoreUpdate = z.infer<typeof AdminSponsoredStoreUpdateSchema>;
export type AdminSponsoredItemInput = z.infer<typeof AdminSponsoredItemInputSchema>;
export type AdminSponsoredItemUpdate = z.infer<typeof AdminSponsoredItemUpdateSchema>;
export type SponsoredPurchaseInput = z.infer<typeof SponsoredPurchaseInputSchema>;
export type AdminSponsoredPurchaseAction = z.infer<typeof AdminSponsoredPurchaseActionSchema>;
export type OwnerServerStoreInput = z.infer<typeof OwnerServerStoreInputSchema>;
export type StoreItemCategory = z.infer<typeof StoreItemCategorySchema>;
export type ServerStoreItemStatus = z.infer<typeof ServerStoreItemStatusSchema>;
export type OwnerServerStoreItemInput = z.infer<typeof OwnerServerStoreItemInputSchema>;
export type OwnerServerStoreItemUpdate = z.infer<typeof OwnerServerStoreItemUpdateSchema>;
export type ServerStorePurchaseInput = z.infer<typeof ServerStorePurchaseInputSchema>;
export type ServerStorePurchaseMutation = z.infer<typeof ServerStorePurchaseMutationSchema>;
export type OwnerServerStorePayoutInput = z.infer<typeof OwnerServerStorePayoutInputSchema>;
export type AdminServerStorePayoutProfileInput = z.infer<
  typeof AdminServerStorePayoutProfileInputSchema
>;
export type AdminServerStorePayoutAction = z.infer<
  typeof AdminServerStorePayoutActionSchema
>;
export type ServerInput = z.infer<typeof ServerInputSchema>;
export type DeleteServerRegistrationInput = z.infer<typeof DeleteServerRegistrationSchema>;
export type ApiError = {
  code: string;
  message: string;
  requestId?: string;
  details?: unknown;
};

export const formatNumber = (value: number) => new Intl.NumberFormat("en-US").format(value);
