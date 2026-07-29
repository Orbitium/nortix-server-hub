import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { prisma, type Prisma } from "@nortix/database";
import {
  AdminCampaignTerminationInputSchema,
  AdminEnrollmentInputSchema,
  AdminMessageInputSchema,
  AdminSparksAdjustmentInputSchema,
  AdminSponsoredItemInputSchema,
  AdminSponsoredItemUpdateSchema,
  AdminSponsoredPurchaseActionSchema,
  AdminSponsoredStoreInputSchema,
  AdminSponsoredStoreUpdateSchema,
  AdminSponsoredCampaignInputSchema,
  CampaignInputSchema,
  JoinCampaignSchema,
  MilestoneSubmissionSchema,
  NotificationPreferenceInputSchema,
  ServerAddressValidationSchema,
  DeleteServerRegistrationSchema,
  ServerInputSchema,
  ServerTeamInviteInputSchema,
  TeamInviteResponseSchema,
  TeamMemberRoleInputSchema,
  CrackedAccountClaimSchema,
  RewardedVoteSessionGrantSchema,
  RewardedVoteSessionInputSchema,
  ServerReviewInputSchema,
  OwnerServerStoreInputSchema,
  OwnerServerStoreItemInputSchema,
  OwnerServerStoreItemUpdateSchema,
  OwnerServerStorePayoutInputSchema,
  ServerStorePurchaseMutationSchema,
  ServerStorePurchaseInputSchema,
  AdminServerStorePayoutActionSchema,
  AdminServerStorePayoutProfileInputSchema,
  AdminServerStatusActionSchema,
  AdminUserStatusActionSchema,
  ServerRewardedVotingSettingSchema,
  ServerVoteInputSchema,
  SponsoredPurchaseInputSchema,
  EquipCosmeticInputSchema,
  UnequipCosmeticInputSchema,
  ClaimReferralInviteInputSchema,
  HypePurchaseInputSchema,
  ServerAwardPurchaseInputSchema,
} from "@nortix/shared";
import {
  CreateServerVerificationSchema,
  PluginCapabilitiesHandshakeSchema,
  PluginCrackedClaimCompletionSchema,
  PluginPresenceSnapshotSchema,
  PluginVerificationHandshakeSchema,
  PluginVerificationStatusSchema,
  ServerPluginEventSchema,
  PluginPlayerHistorySchema,
  PluginStoreDeliveryQuerySchema,
  PluginStoreDeliveryResultSchema,
} from "@nortix/plugin-sdk";
import { MockPaymentProvider } from "@nortix/integrations";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Env } from "../config/env.js";
import {
  canAccessServer,
  teamPermissions,
  validatePluginEvent,
  type ServerPermission,
} from "../security/policies.js";
import { verifyPremiumIdentityProof } from "../security/identity-proof.js";
import {
  authenticateSignedPluginRequest,
  generatePluginKeyPair,
} from "../security/plugin-request-signing.js";
import {
  CAMPAIGN_ACTIVITY_WINDOW_DAYS,
  calculateCampaignCreditBalance,
  canAutomaticallyApprovePluginMilestone,
  deriveCampaignCapacity,
  estimatePotentialExposure,
  evaluateCampaignEligibility,
  suggestCampaignMilestones,
} from "./campaigns/policy.js";
import { CampaignService } from "./campaigns/service.js";
import { ServerVerificationService } from "./server-verification/service.js";
import { MinecraftIdentityService } from "./minecraft-identities/service.js";
import { createNotification, NotificationService } from "./notifications/service.js";
import { ServerDiscoveryService } from "./server-discovery/service.js";
import { McsrvstatClient, McsrvstatRequestError } from "./server-discovery/mcsrvstat-client.js";
import { QuestService } from "./quests/service.js";
import { ActivityService } from "./activity/service.js";
import { CosmeticService } from "./cosmetics/service.js";
import { normalizeCosmeticPreview } from "./cosmetics/policy.js";
import { ReferralService } from "./referrals/service.js";
import { VotingService } from "./voting/service.js";
import { verifyVoteTurnstile } from "./voting/turnstile.js";
import { GameplayService } from "./gameplay/service.js";
import { SponsoredShopService } from "./sponsored-shop/service.js";
import { ServerStoreService } from "./server-store/service.js";
import {
  MAX_STORE_IMAGE_BYTES,
  ServerStoreMediaService,
} from "./server-store/media.js";
import { AdminEnrollmentService } from "./admin-enrollment/service.js";
import { AdminSparksService } from "./admin-sparks/service.js";
import { AdminSparkEconomyService } from "./admin-sparks/economy-service.js";
import { presentOwnerPluginState } from "./owner-servers/presenter.js";
import { buildCampaignShareHtml } from "./campaign-sharing/html.js";
import { normalizeServerHostname } from "./server-registration/policy.js";
import { ServerRegistrationService } from "./server-registration/service.js";
import { AdminEntityService } from "./admin-entities/service.js";
import { HypeService } from "./hype/service.js";
import { discoveryScore, utcDayStart } from "./hype/policy.js";
import { ServerAwardService } from "./awards/service.js";

const campaignService = new CampaignService();
const serverVerificationService = new ServerVerificationService();
const minecraftIdentityService = new MinecraftIdentityService();
const notificationService = new NotificationService();
const questService = new QuestService();
const activityService = new ActivityService();
const cosmeticService = new CosmeticService();
const referralService = new ReferralService();
const votingService = new VotingService();
const gameplayService = new GameplayService();
const sponsoredShopService = new SponsoredShopService();
const adminEnrollmentService = new AdminEnrollmentService();
const adminSparksService = new AdminSparksService();
const adminSparkEconomyService = new AdminSparkEconomyService();
const serverRegistrationService = new ServerRegistrationService();
const adminEntityService = new AdminEntityService();
const hypeService = new HypeService();
const serverAwardService = new ServerAwardService();
const REWARDED_VOTE_SESSION_TTL_MS = 10 * 60_000;
const hashRewardedVoteToken = (token: string) => createHash("sha256").update(token).digest("hex");

const getWeightedVoteCount = async (serverId: string, voteDateFrom?: Date) => {
  const result = await prisma.serverVote.aggregate({
    where: {
      serverId,
      ...(voteDateFrom ? { voteDate: { gte: voteDateFrom } } : {}),
    },
    _sum: { weight: true },
  });
  return result._sum.weight ?? 0;
};

const utcMonthStart = (date = new Date()) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));

const SERVER_VALIDATION_TTL_MS = 10 * 60_000;
const validationPayload = (
  ownerId: string,
  hostname: string,
  port: number,
  edition: string,
  expiresAt: number,
) => `${ownerId}|${normalizeServerHostname(hostname)}|${port}|${edition}|${expiresAt}`;
const signServerValidation = (payload: string, secret: string) =>
  createHmac("sha256", secret).update(payload).digest("base64url");
const isValidServerValidationSignature = (
  signature: string | undefined,
  ownerId: string,
  hostname: string,
  port: number,
  edition: string,
  secret: string,
) => {
  if (!signature) return false;
  const [expiresText, supplied] = signature.split(".");
  const expiresAt = Number(expiresText);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Date.now() || !supplied) return false;
  const expectedBuffer = Buffer.from(
    signServerValidation(validationPayload(ownerId, hostname, port, edition, expiresAt), secret),
  );
  const suppliedBuffer = Buffer.from(supplied);
  return (
    expectedBuffer.length === suppliedBuffer.length &&
    timingSafeEqual(expectedBuffer, suppliedBuffer)
  );
};

const requireOwnedServer = async (serverId: string, userId: string) => {
  const server = await prisma.server.findFirst({ where: { id: serverId, ownerId: userId } });
  if (!server) throw new Error("Only the server owner can manage team access.");
  return server;
};

const requireServerPermission = async (
  serverId: string,
  userId: string,
  permission: ServerPermission,
) => {
  const server = await prisma.server.findUnique({
    where: { id: serverId },
    include: { teamMembers: { where: { userId }, select: { role: true } } },
  });
  const role = server?.teamMembers[0]?.role;
  if (!server || !canAccessServer(server.ownerId, userId, role, permission)) {
    throw new Error("Server access not found.");
  }
  return server;
};

const selfUserSelect = {
  id: true,
  username: true,
  displayName: true,
  email: true,
  avatarUrl: true,
  roles: true,
  status: true,
  countryCode: true,
  preferredCurrency: true,
  publicProfile: true,
  reputationScore: true,
  reputationTier: true,
  testerLevel: true,
  testerExperience: true,
  createdAt: true,
  lastActiveAt: true,
} as const;

const publicServerSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  versions: true,
  edition: true,
  categories: true,
  tags: true,
  logoUrl: true,
  bannerUrl: true,
  screenshotUrls: true,
  discordUrl: true,
  websiteUrl: true,
  verificationStatus: true,
  online: true,
  playerCount: true,
  maxPlayers: true,
  hostname: true,
  port: true,
  rewardedVotingEnabled: true,
} as const;

const publicMilestoneSelect = {
  id: true,
  templateType: true,
  title: true,
  publicInstructions: true,
  order: true,
  sparksReward: true,
  verificationMethod: true,
} as const;

const profileInputSchema = z
  .object({
    username: z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9_]{3,16}$/)
      .optional(),
    displayName: z.string().trim().min(1).max(80).optional(),
    avatarUrl: z.string().url().max(2_000).nullable().optional(),
    bio: z.string().trim().max(240).optional(),
    backgroundColor: z.enum(["slate", "violet", "ocean", "moss", "ember"]).optional(),
    isPublic: z.boolean().optional(),
    showReputation: z.boolean().optional(),
  })
  .strict();

const campaignReviewSchema = z
  .object({
    action: z.enum(["APPROVE", "REQUEST_CHANGES", "REJECT", "PAUSE", "ARCHIVE"]),
    note: z.string().trim().max(2_000).optional(),
  })
  .strict();

const completionReviewSchema = z
  .object({
    approved: z.boolean(),
    reason: z.string().trim().max(2_000).optional(),
  })
  .strict();

const sparksPurchaseSchema = z
  .object({
    itemId: z.string().min(1).max(120),
  })
  .strict();

const premiumIdentityCompletionSchema = z
  .object({
    code: z.string().regex(/^NX-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}$/),
    uuid: z.string().uuid(),
    username: z.string().regex(/^[A-Za-z0-9_]{3,16}$/),
  })
  .strict();

const parsePagination = (query: Record<string, unknown>) => ({
  page: Math.max(1, Number(query.page) || 1),
  pageSize: Math.min(50, Math.max(1, Number(query.pageSize) || 12)),
});

export const registerRoutes = async (app: FastifyInstance, env: Env) => {
  const mcStatusClient = new McsrvstatClient(env.MCSRVSTAT_USER_AGENT);
  const paymentProvider = new MockPaymentProvider(env.PAYMENT_WEBHOOK_SECRET);
  const serverStoreService = new ServerStoreService(
    env.STORE_PROCEEDS_CENTS_PER_1000_SPARKS,
    env.STORE_PAYOUT_REQUESTS_ENABLED,
    env.STORE_MIN_PAYOUT_CENTS,
  );
  const serverStoreMediaService = new ServerStoreMediaService(env.STORE_MEDIA_DIRECTORY);
  const identityCleanupTimer = setInterval(
    () =>
      minecraftIdentityService
        .cleanup()
        .catch((error) => app.log.error({ err: error }, "minecraft identity cleanup failed")),
    5 * 60_000,
  );
  const serverDiscoveryService = new ServerDiscoveryService(env, app.log);
  serverDiscoveryService.start();
  identityCleanupTimer.unref();
  app.addHook("onClose", async () => {
    clearInterval(identityCleanupTimer);
    serverDiscoveryService.stop();
  });
  app.get("/health", async () => ({ status: "ok", service: "nortix-api" }));
  app.get("/v1/media/store-items/:assetName", async (request, reply) => {
    const { assetName } = request.params as { assetName: string };
    const asset = await serverStoreMediaService.open(assetName);
    if (!asset) {
      return reply.code(404).send({
        code: "NOT_FOUND",
        message: "The store image was not found.",
        requestId: request.id,
      });
    }
    return reply
      .type(asset.contentType)
      .header("Content-Length", String(asset.byteSize))
      .header("Cache-Control", "public, max-age=31536000, immutable")
      .header("Cross-Origin-Resource-Policy", "same-origin")
      .header("X-Content-Type-Options", "nosniff")
      .send(asset.body);
  });
  app.get("/share/campaigns/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const campaign = await prisma.campaign.findFirst({
      where: {
        id,
        status: { in: ["ACTIVE", "SCHEDULED"] },
        server: { publicListing: true, moderationStatus: "APPROVED", edition: "JAVA" },
      },
      select: {
        id: true,
        title: true,
        description: true,
        maximumSparksReward: true,
        milestones: { select: { id: true } },
        server: {
          select: { name: true, slug: true, bannerUrl: true, logoUrl: true },
        },
      },
    });
    if (!campaign) {
      return reply.code(404).type("text/html; charset=utf-8").send("<h1>Campaign not found</h1>");
    }
    const origin =
      env.NODE_ENV === "production"
        ? "https://hub.nortixlabs.com"
        : env.WEB_ORIGIN.split(",")[0]!.replace(/\/$/, "");
    const shareUrl = `${origin}/share/campaigns/${encodeURIComponent(campaign.id)}`;
    const targetUrl = `${origin}/servers/${encodeURIComponent(campaign.server.slug)}?campaign=${encodeURIComponent(campaign.id)}`;
    const imageSource = campaign.server.bannerUrl ?? campaign.server.logoUrl;
    let imageUrl: string | null = null;
    if (imageSource) {
      try {
        imageUrl = new URL(imageSource, origin).toString();
      } catch {
        imageUrl = null;
      }
    }
    const shortDescription = `${campaign.description.slice(0, 180)} ${campaign.milestones.length} milestones; eligible verified activity may receive up to ${campaign.maximumSparksReward} Sparks.`;
    return reply
      .header("Cache-Control", "public, max-age=300, stale-while-revalidate=3600")
      .type("text/html; charset=utf-8")
      .send(
        buildCampaignShareHtml({
          title: campaign.title,
          description: shortDescription,
          serverName: campaign.server.name,
          shareUrl,
          targetUrl,
          imageUrl,
        }),
      );
  });
  app.get("/sitemap.xml", async (_request, reply) => {
    const now = new Date();
    const [servers, campaigns, discoveredServers] = await prisma.$transaction([
      prisma.server.findMany({
        where: { publicListing: true, moderationStatus: "APPROVED", edition: "JAVA" },
        select: { slug: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.campaign.findMany({
        where: {
          status: "ACTIVE",
          startsAt: { lte: now },
          endsAt: { gt: now },
          server: { publicListing: true, moderationStatus: "APPROVED", edition: "JAVA" },
        },
        select: { id: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.discoveredServer.findMany({
        where: { enabled: true, edition: "JAVA" },
        select: { slug: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
      }),
    ]);
    const origin = "https://hub.nortixlabs.com";
    const staticEntries = [
      ["/servers", "daily", "1.0"],
      ["/campaigns", "daily", "1.0"],
      ["/how-it-works", "monthly", "0.8"],
      ["/for-server-owners", "monthly", "0.8"],
      ["/safety", "monthly", "0.7"],
      ["/guidelines", "monthly", "0.5"],
      ["/privacy", "monthly", "0.4"],
      ["/terms", "monthly", "0.4"],
      ["/contact", "yearly", "0.5"],
    ] as const;
    const urls = [
      ...staticEntries.map(
        ([path, changefreq, priority]) =>
          `<url><loc>${origin}${path}</loc><changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`,
      ),
      ...servers.map(
        (server) =>
          `<url><loc>${origin}/servers/${encodeURIComponent(server.slug)}</loc><lastmod>${server.updatedAt.toISOString()}</lastmod><changefreq>daily</changefreq><priority>0.9</priority></url>`,
      ),
      ...discoveredServers.map(
        (server) =>
          `<url><loc>${origin}/servers/${encodeURIComponent(server.slug)}</loc><lastmod>${server.updatedAt.toISOString()}</lastmod><changefreq>daily</changefreq><priority>0.6</priority></url>`,
      ),
      ...campaigns.map(
        (campaign) =>
          `<url><loc>${origin}/campaigns/${encodeURIComponent(campaign.id)}</loc><lastmod>${campaign.updatedAt.toISOString()}</lastmod><changefreq>daily</changefreq><priority>0.8</priority></url>`,
      ),
    ];
    return reply
      .type("application/xml; charset=utf-8")
      .send(
        `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join("")}</urlset>`,
      );
  });

  app.get("/v1/auth/me", { preHandler: app.authenticate }, async (request) =>
    prisma.user.findUnique({ where: { id: request.user!.id }, select: selfUserSelect }),
  );
  app.get("/v1/users/me", { preHandler: app.authenticate }, async (request) =>
    prisma.user.findUnique({ where: { id: request.user!.id }, select: selfUserSelect }),
  );
  app.post(
    "/v1/admin/enrollment/redeem",
    {
      preHandler: app.authenticate,
      config: { rateLimit: { max: 5, timeWindow: "1 hour" } },
    },
    async (request) => {
      const input = AdminEnrollmentInputSchema.parse(request.body);
      return adminEnrollmentService.redeem(request.user!.id, input.token, request.id);
    },
  );
  app.get("/v1/referrals", { preHandler: app.authenticate }, async (request) => {
    const invites = await referralService.list(request.user!.id);
    await questService.evaluateAndAward(request.user!.id);
    return invites;
  });
  app.post("/v1/referrals", { preHandler: app.authenticate }, async (request, reply) =>
    reply.code(201).send(await referralService.create(request.user!.id, request.id)),
  );
  app.post("/v1/referrals/claim", { preHandler: app.authenticate }, async (request, reply) => {
    const input = ClaimReferralInviteInputSchema.parse(request.body);
    const result = await referralService.claim(request.user!.id, input.code, request.id);
    await questService.evaluateAndAward(request.user!.id);
    return reply.code(201).send(result);
  });
  app.patch("/v1/users/me/profile", { preHandler: app.authenticate }, async (request) => {
    const input = profileInputSchema.parse(request.body);
    const current = await prisma.user.findUnique({
      where: { id: request.user!.id },
      select: { username: true, displayName: true, avatarUrl: true, publicProfile: true },
    });
    if (!current) throw new Error("Profile not found.");
    if (input.username && input.username.toLowerCase() !== current.username.toLowerCase()) {
      const usernameTaken = await prisma.user.findFirst({
        where: {
          username: { equals: input.username, mode: "insensitive" },
          NOT: { id: request.user!.id },
        },
        select: { id: true },
      });
      if (usernameTaken) throw new Error("That username is already taken.");
    }
    const currentPublicProfile =
      current.publicProfile && typeof current.publicProfile === "object"
        ? (current.publicProfile as Record<string, unknown>)
        : {};
    const publicProfile = {
      ...currentPublicProfile,
      ...(input.bio !== undefined ? { bio: input.bio } : {}),
      ...(input.backgroundColor !== undefined ? { backgroundColor: input.backgroundColor } : {}),
      ...(input.isPublic !== undefined ? { isPublic: input.isPublic } : {}),
      ...(input.showReputation !== undefined ? { showReputation: input.showReputation } : {}),
    };
    return prisma.$transaction(async (transaction) => {
      const updated = await transaction.user.update({
        where: { id: request.user!.id },
        data: {
          username: input.username,
          displayName: input.displayName,
          avatarUrl: input.avatarUrl,
          publicProfile: publicProfile as Prisma.InputJsonValue,
        },
        select: selfUserSelect,
      });
      await transaction.auditLog.create({
        data: {
          actorId: request.user!.id,
          action: "PROFILE_UPDATED",
          entityType: "USER",
          entityId: request.user!.id,
          beforeSnapshot: {
            username: current.username,
            displayName: current.displayName,
            avatarUrl: current.avatarUrl,
            publicProfile: currentPublicProfile,
          } as Prisma.InputJsonValue,
          afterSnapshot: {
            username: updated.username,
            displayName: updated.displayName,
            avatarUrl: updated.avatarUrl,
            publicProfile,
          } as Prisma.InputJsonValue,
        },
      });
      return updated;
    });
  });
  app.get("/v1/notifications/summary", { preHandler: app.authenticate }, async (request) =>
    notificationService.summary(request.user!.id),
  );
  app.get("/v1/notifications", { preHandler: app.authenticate }, async (request) => {
    const query = z.object({ unread: z.enum(["true", "false"]).optional() }).parse(request.query);
    return notificationService.listNotifications(request.user!.id, query.unread === "true");
  });
  app.patch(
    "/v1/notifications/:id/read",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      await notificationService.markNotificationRead(request.user!.id, id);
      return reply.code(204).send();
    },
  );
  app.delete("/v1/notifications/:id", { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await notificationService.archive(request.user!.id, "notification", id);
    return reply.code(204).send();
  });
  app.get("/v1/messages", { preHandler: app.authenticate }, async (request) => {
    const query = z.object({ unread: z.enum(["true", "false"]).optional() }).parse(request.query);
    return notificationService.listMessages(request.user!.id, query.unread === "true");
  });
  app.patch("/v1/messages/:id/read", { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await notificationService.markMessageRead(request.user!.id, id);
    return reply.code(204).send();
  });
  app.delete("/v1/messages/:id", { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await notificationService.archive(request.user!.id, "message", id);
    return reply.code(204).send();
  });
  app.post("/v1/inbox/read-all", { preHandler: app.authenticate }, async (request, reply) => {
    const { kind } = z
      .object({ kind: z.enum(["notifications", "messages", "all"]) })
      .parse(request.body);
    await notificationService.markAllRead(request.user!.id, kind);
    return reply.code(204).send();
  });
  app.get("/v1/notification-preferences", { preHandler: app.authenticate }, async (request) =>
    notificationService.getPreferences(request.user!.id),
  );
  app.put("/v1/notification-preferences", { preHandler: app.authenticate }, async (request) =>
    notificationService.updatePreferences(
      request.user!.id,
      NotificationPreferenceInputSchema.parse(request.body),
    ),
  );
  app.get("/v1/minecraft-identities", { preHandler: app.authenticate }, async (request) =>
    minecraftIdentityService.list(request.user!.id),
  );
  app.post(
    "/v1/minecraft-identities/premium/claims",
    { preHandler: app.authenticate, config: { rateLimit: { max: 5, timeWindow: "1 hour" } } },
    async (request, reply) =>
      reply.code(201).send(await minecraftIdentityService.createPremiumClaim(request.user!.id)),
  );
  app.delete(
    "/v1/minecraft-identities/premium/:identityId",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const { identityId } = request.params as { identityId: string };
      await minecraftIdentityService.unlinkPremium(request.user!.id, identityId);
      return reply.code(204).send();
    },
  );
  app.post(
    "/v1/minecraft-identities/cracked/claims",
    { preHandler: app.authenticate, config: { rateLimit: { max: 6, timeWindow: "1 hour" } } },
    async (request, reply) => {
      const input = CrackedAccountClaimSchema.parse(request.body);
      const link = await minecraftIdentityService.reserveCracked(
        request.user!.id,
        input.serverId,
        input.minecraftUsername,
      );
      await questService.evaluateAndAward(request.user!.id);
      return reply.code(201).send(link);
    },
  );
  app.delete(
    "/v1/minecraft-identities/cracked/:linkId",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const { linkId } = request.params as { linkId: string };
      await minecraftIdentityService.releaseCracked(request.user!.id, linkId);
      return reply.code(204).send();
    },
  );
  app.post(
    "/v1/plugin/identity/premium/complete",
    { config: { rateLimit: { max: 60, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const input = premiumIdentityCompletionSchema.parse(request.body);
      const timestamp = String(request.headers["x-nortix-timestamp"] ?? "");
      const nonce = String(request.headers["x-nortix-nonce"] ?? "");
      const signature = String(request.headers["x-nortix-signature"] ?? "").toLowerCase();
      if (
        !verifyPremiumIdentityProof(env.IDENTITY_VERIFICATION_SECRET, input, {
          timestamp,
          nonce,
          signature,
        })
      ) {
        return reply.code(401).send({
          code: "INVALID_VERIFICATION_PROOF",
          message: "The identity verification proof is invalid or expired.",
        });
      }
      const identity = await minecraftIdentityService.completePremiumClaim(
        input.code,
        input.uuid,
        input.username,
      );
      await questService.evaluateAndAward(identity.userId);
      return reply.code(201).send({ linked: true, identityId: identity.id });
    },
  );
  app.get("/v1/users/:username", async (request, reply) => {
    const { username } = request.params as { username: string };
    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        username: true,
        displayName: true,
        avatarUrl: true,
        reputationScore: true,
        reputationTier: true,
        testerLevel: true,
        publicProfile: true,
        equippedCosmetics: {
          select: {
            type: true,
            item: {
              select: {
                id: true,
                name: true,
                type: true,
                rarity: true,
                preview: true,
              },
            },
          },
        },
      },
    });
    if (
      !user ||
      (user.publicProfile &&
        typeof user.publicProfile === "object" &&
        "isPublic" in user.publicProfile &&
        user.publicProfile.isPublic === false)
    ) {
      return reply.code(404).send({ code: "NOT_FOUND", message: "Profile not found." });
    }
    const profile =
      user.publicProfile && typeof user.publicProfile === "object"
        ? (user.publicProfile as Record<string, unknown>)
        : {};
    return {
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      reputationScore: profile.showReputation === false ? null : user.reputationScore,
      reputationTier: profile.showReputation === false ? null : user.reputationTier,
      testerLevel: profile.showReputation === false ? null : user.testerLevel,
      publicProfile: {
        bio: typeof profile.bio === "string" ? profile.bio : null,
        backgroundColor:
          typeof profile.backgroundColor === "string" ? profile.backgroundColor : "slate",
        isPublic: profile.isPublic !== false,
        showReputation: profile.showReputation !== false,
      },
      cosmetics: user.equippedCosmetics.map((selection) => ({
        id: selection.item.id,
        name: selection.item.name,
        type: selection.item.type,
        rarity: selection.item.rarity,
        preview: normalizeCosmeticPreview(selection.item.preview),
      })),
    };
  });
  app.get("/v1/leaderboard", async () =>
    prisma.user.findMany({
      where: { status: "ACTIVE" },
      select: {
        username: true,
        displayName: true,
        avatarUrl: true,
        reputationScore: true,
        reputationTier: true,
        testerLevel: true,
      },
      orderBy: [{ reputationScore: "desc" }, { testerLevel: "desc" }],
      take: 50,
    }),
  );

  app.get("/v1/servers", async (request) => {
    const query = request.query as Record<string, unknown>;
    const { page, pageSize } = parsePagination(query);
    const search = String(query.search ?? "");
    const where = {
      publicListing: true,
      moderationStatus: "APPROVED" as const,
      edition: "JAVA" as const,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { description: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };
    const [items, ownedTotal, discoveredItems] = await Promise.all([
      prisma.server.findMany({
        where,
        select: {
          ...publicServerSelect,
          playerHistorySyncedAt: true,
          pluginLastSeenAt: true,
          hypeScore: true,
          hypePeriodStart: true,
          _count: {
            select: {
              campaigns: {
                where: {
                  status: "ACTIVE",
                  startsAt: { lte: new Date() },
                  endsAt: { gt: new Date() },
                },
              },
              reviews: { where: { moderationStatus: "APPROVED" } },
              votes: true,
              awardPurchases: true,
            },
          },
          reviews: {
            where: { moderationStatus: "APPROVED" },
            select: { rating: true },
          },
        },
        orderBy: [{ online: "desc" }, { playerCount: "desc" }],
      }),
      prisma.server.count({ where }),
      serverDiscoveryService.list(search),
    ]);
    const serverIds = items.map((server) => server.id);
    const today = utcDayStart();
    const recentStart = new Date(today.getTime() - 6 * 86_400_000);
    const previousStart = new Date(today.getTime() - 13 * 86_400_000);
    const [voteWeights, monthlyVoteWeights, campaignSignals, gameplaySignals] =
      serverIds.length === 0
        ? [[], [], [], []]
        : await Promise.all([
            prisma.serverVote.groupBy({
              by: ["serverId"],
              where: { serverId: { in: serverIds } },
              _sum: { weight: true },
            }),
            prisma.serverVote.groupBy({
              by: ["serverId"],
              where: {
                serverId: { in: serverIds },
                voteDate: { gte: utcMonthStart() },
              },
              _sum: { weight: true },
            }),
            prisma.campaign.findMany({
              where: {
                serverId: { in: serverIds },
                status: { in: ["ACTIVE", "COMPLETED"] },
              },
              select: {
                serverId: true,
                participations: { select: { status: true } },
              },
            }),
            prisma.playerGameplayDailyStat.findMany({
              where: {
                serverId: { in: serverIds },
                activityDate: { gte: previousStart },
                OR: [{ joins: { gt: 0 } }, { playtimeSeconds: { gt: 0 } }],
              },
              select: { serverId: true, userId: true, activityDate: true },
            }),
          ]);
    const voteWeightsByServer = new Map(
      voteWeights.map((vote) => [vote.serverId, vote._sum.weight ?? 0]),
    );
    const monthlyVotesByServer = new Map(
      monthlyVoteWeights.map((vote) => [vote.serverId, vote._sum.weight ?? 0]),
    );
    const campaignRates = new Map<string, { completed: number; total: number }>();
    for (const campaign of campaignSignals) {
      const current = campaignRates.get(campaign.serverId) ?? { completed: 0, total: 0 };
      current.total += campaign.participations.length;
      current.completed += campaign.participations.filter(
        (participation) => participation.status === "COMPLETED",
      ).length;
      campaignRates.set(campaign.serverId, current);
    }
    const activitySets = new Map<string, { previous: Set<string>; recent: Set<string> }>();
    for (const activity of gameplaySignals) {
      const current = activitySets.get(activity.serverId) ?? {
        previous: new Set<string>(),
        recent: new Set<string>(),
      };
      (activity.activityDate >= recentStart ? current.recent : current.previous).add(activity.userId);
      activitySets.set(activity.serverId, current);
    }
    const ownedItems = items.map(
      ({
        playerHistorySyncedAt,
        pluginLastSeenAt,
        hypeScore,
        hypePeriodStart,
        reviews,
        _count,
        ...server
      }) => {
        const rating =
          reviews.length > 0
            ? Number(
                (
                  reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
                ).toFixed(1),
              )
            : null;
        const hype = hypeService.present(hypeScore, hypePeriodStart);
        const campaignRate = campaignRates.get(server.id);
        const activity = activitySets.get(server.id);
        const retained =
          activity?.previous.size
            ? [...activity.previous].filter((userId) => activity.recent.has(userId)).length /
              activity.previous.size
            : null;
        const score = discoveryScore({
          hype: hype.total,
          online: server.online,
          playerCount: server.playerCount ?? 0,
          rating,
          reviewCount: _count.reviews,
          monthlyVotes: monthlyVotesByServer.get(server.id) ?? 0,
          activeCampaigns: _count.campaigns,
          completionRate:
            campaignRate?.total ? campaignRate.completed / campaignRate.total : null,
          retentionRate: retained,
          recentlyActive:
            server.online ||
            Boolean(pluginLastSeenAt && pluginLastSeenAt >= new Date(Date.now() - 7 * 86_400_000)),
        });
        return {
          ...server,
          source: "NORTIX" as const,
          rating,
          reviewCount: _count.reviews,
          voteCount: voteWeightsByServer.get(server.id) ?? 0,
          monthlyVoteCount: monthlyVotesByServer.get(server.id) ?? 0,
          activeCampaignCount: _count.campaigns,
          awardCount: _count.awardPurchases,
          crackedAccountLinkingAvailable: Boolean(playerHistorySyncedAt),
          hype,
          discoveryScore: Math.round(score * 100) / 100,
        };
      },
    );
    const combined = [...ownedItems, ...discoveredItems].sort(
      (a, b) =>
        ((b as (typeof ownedItems)[number]).discoveryScore ?? 0) -
          ((a as (typeof ownedItems)[number]).discoveryScore ?? 0) ||
        Number(b.online) - Number(a.online) ||
        (b.playerCount ?? 0) - (a.playerCount ?? 0),
    );
    return {
      items: combined.slice((page - 1) * pageSize, page * pageSize).map((item) => {
        if (!("discoveryScore" in item)) return item;
        const { discoveryScore: _discoveryScore, ...publicItem } = item;
        return publicItem;
      }),
      page,
      pageSize,
      total: ownedTotal + discoveredItems.length,
    };
  });
  app.get("/v1/servers/:slug", async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const server = await prisma.server.findFirst({
      where: { slug, publicListing: true, moderationStatus: "APPROVED", edition: "JAVA" },
      select: {
        ...publicServerSelect,
        hypeScore: true,
        hypePeriodStart: true,
        _count: {
          select: {
            campaigns: {
              where: { status: { in: ["SCHEDULED", "ACTIVE", "COMPLETED"] } },
            },
            awardPurchases: true,
          },
        },
        campaigns: {
          where: { status: "ACTIVE" },
          select: {
            id: true,
            title: true,
            description: true,
            category: true,
            startsAt: true,
            endsAt: true,
            maxParticipants: true,
            minimumSparksReward: true,
            maximumSparksReward: true,
            potentialExposureMin: true,
            potentialExposureMax: true,
            automaticVerification: true,
            versionRequirements: true,
            regionRestrictions: true,
            milestones: { select: publicMilestoneSelect, orderBy: { order: "asc" } },
          },
        },
        reviews: {
          where: { moderationStatus: "APPROVED" },
          select: {
            id: true,
            rating: true,
            text: true,
            campaignLinked: true,
            helpfulCount: true,
            createdAt: true,
            player: {
              select: { username: true, displayName: true, avatarUrl: true },
            },
          },
        },
      },
    });
    if (!server) {
      const discoveredServer = await serverDiscoveryService.getBySlug(slug);
      return (
        discoveredServer ??
        reply.code(404).send({ code: "NOT_FOUND", message: "Server not found." })
      );
    }
    const { _count, hypeScore, hypePeriodStart, ...publicServer } = server;
    const activitySince = new Date(Date.now() - 7 * 86_400_000);
    const [voteCount, monthlyVoteCount, playerAverage, awards] = await Promise.all([
      getWeightedVoteCount(server.id),
      getWeightedVoteCount(server.id, utcMonthStart()),
      prisma.serverActivitySample.aggregate({
        where: { serverId: server.id, observedAt: { gte: activitySince } },
        _avg: { onlinePlayers: true },
      }),
      serverAwardService.summary(server.id),
    ]);
    return {
      ...publicServer,
      source: "NORTIX",
      rating:
        server.reviews.length > 0
          ? Number(
              (
                server.reviews.reduce((sum, review) => sum + review.rating, 0) /
                server.reviews.length
              ).toFixed(1),
            )
          : null,
      reviewCount: server.reviews.length,
      voteCount,
      monthlyVoteCount,
      averagePlayerCount:
        playerAverage._avg.onlinePlayers == null
          ? null
          : Math.round(playerAverage._avg.onlinePlayers * 10) / 10,
      averagePlayerWindowDays: 7,
      campaignCountAllTime: _count.campaigns,
      activeCampaignCount: server.campaigns.length,
      hype: hypeService.present(hypeScore, hypePeriodStart),
      awards,
    };
  });
  app.get(
    "/v1/servers/:id/hype/eligibility",
    { preHandler: app.authenticate },
    async (request) => {
      const { id } = request.params as { id: string };
      return hypeService.eligibility(request.user!.id, id);
    },
  );
  app.post(
    "/v1/servers/:id/hype",
    {
      preHandler: app.authenticate,
      config: { rateLimit: { max: 12, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const input = HypePurchaseInputSchema.parse(request.body);
      const result = await hypeService.purchase(
        request.user!.id,
        id,
        input.idempotencyKey,
        request.id,
      );
      return reply.code(result.replayed ? 200 : 201).send(result);
    },
  );
  app.get(
    "/v1/servers/:id/awards/eligibility",
    { preHandler: app.authenticate },
    async (request) => {
      const { id } = request.params as { id: string };
      return serverAwardService.eligibility(request.user!.id, id);
    },
  );
  app.post(
    "/v1/servers/:id/awards",
    {
      preHandler: app.authenticate,
      config: { rateLimit: { max: 20, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const input = ServerAwardPurchaseInputSchema.parse(request.body);
      const result = await serverAwardService.purchase({
        userId: request.user!.id,
        serverId: id,
        kind: input.kind,
        showGiver: input.showGiver,
        idempotencyKey: input.idempotencyKey,
        requestId: request.id,
      });
      return reply.code(result.replayed ? 200 : 201).send(result);
    },
  );
  app.get("/v1/voting/config", async () => ({ turnstileSiteKey: env.TURNSTILE_SITE_KEY }));
  app.get("/v1/voting/servers", { preHandler: app.authenticate }, async (request) => ({
    ...(await votingService.list(request.user!.id)),
    rewardedAdsAvailable: Boolean(env.GOOGLE_AD_MANAGER_REWARDED_AD_UNIT_PATH),
  }));
  app.post(
    "/v1/servers/:id/vote",
    {
      preHandler: app.authenticate,
      config: { rateLimit: { max: 10, timeWindow: "1 day" } },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const input = ServerVoteInputSchema.parse(request.body ?? {});
      await verifyVoteTurnstile(env.TURNSTILE_SECRET_KEY, input.turnstileToken, request.ip);
      const result = await votingService.vote(request.user!.id, id);
      await questService.evaluateAndAward(request.user!.id);
      return reply.code(201).send(result);
    },
  );
  app.post(
    "/v1/servers/:id/rewarded-vote-sessions",
    {
      preHandler: app.authenticate,
      config: { rateLimit: { max: 5, timeWindow: "1 hour" } },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const input = RewardedVoteSessionInputSchema.parse(request.body);
      if (!env.GOOGLE_AD_MANAGER_REWARDED_AD_UNIT_PATH) {
        return reply.code(503).send({
          code: "REWARDED_ADS_UNAVAILABLE",
          message: "Rewarded voting is not currently available.",
        });
      }
      await verifyVoteTurnstile(env.TURNSTILE_SECRET_KEY, input.turnstileToken, request.ip);
      const token = randomBytes(32).toString("base64url");
      const session = await votingService.startRewardedSession(
        request.user!.id,
        id,
        hashRewardedVoteToken(token),
        new Date(Date.now() + REWARDED_VOTE_SESSION_TTL_MS),
      );
      return reply.code(201).send({
        sessionId: session.id,
        token,
        expiresAt: session.expiresAt,
        adUnitPath: env.GOOGLE_AD_MANAGER_REWARDED_AD_UNIT_PATH,
        provider: "GOOGLE_AD_MANAGER",
      });
    },
  );
  app.post(
    "/v1/servers/:id/rewarded-vote-sessions/:sessionId/grant",
    {
      preHandler: app.authenticate,
      config: { rateLimit: { max: 8, timeWindow: "1 hour" } },
    },
    async (request, reply) => {
      const { id, sessionId } = request.params as { id: string; sessionId: string };
      const input = RewardedVoteSessionGrantSchema.parse(request.body);
      const result = await votingService.redeemRewardedSession(
        request.user!.id,
        id,
        sessionId,
        hashRewardedVoteToken(input.token),
        request.id,
      );
      await questService.evaluateAndAward(request.user!.id);
      return reply.code(201).send(result);
    },
  );
  app.post("/v1/servers/:id/reviews", { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = ServerReviewInputSchema.parse(request.body);
    const server = await prisma.server.findFirst({
      where: { id, publicListing: true, moderationStatus: "APPROVED" },
      select: { id: true },
    });
    if (!server) return reply.code(404).send({ code: "NOT_FOUND", message: "Server not found." });
    const review = await prisma.review.upsert({
      where: { serverId_playerId: { serverId: id, playerId: request.user!.id } },
      create: {
        serverId: id,
        playerId: request.user!.id,
        rating: input.rating,
        text: input.text,
        moderationStatus: "APPROVED",
      },
      update: {
        rating: input.rating,
        text: input.text,
        moderationStatus: "APPROVED",
        createdAt: new Date(),
      },
      select: { id: true, rating: true, text: true, createdAt: true },
    });
    await questService.evaluateAndAward(request.user!.id);
    return reply.code(201).send(review);
  });
  app.post("/v1/servers", { preHandler: app.authenticate }, async (request, reply) => {
    const input = ServerInputSchema.parse(request.body);
    if (
      !input.verificationParentId &&
      !isValidServerValidationSignature(
        input.serverValidationSignature,
        request.user!.id,
        input.hostname,
        input.port,
        input.edition,
        env.SERVER_VALIDATION_SECRET,
      )
    ) {
      throw new Error("A valid public server address validation is required before registration.");
    }
    const slug = `${input.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")}-${crypto.randomUUID().slice(0, 5)}`;
    const verificationParent = input.verificationParentId
      ? await prisma.server.findFirst({
          where: {
            id: input.verificationParentId,
            ownerId: request.user!.id,
            claimed: true,
            verificationStatus: "VERIFIED",
            verificationScope: "PROXY_NETWORK",
          },
        })
      : null;
    if (input.verificationParentId && !verificationParent) {
      throw new Error("A verified proxy network is required for inherited verification.");
    }
    let serverIcon: string | null = null;
    if (!verificationParent) {
      try {
        const status = await mcStatusClient.getStatus({
          hostname: input.hostname,
          port: input.port,
          edition: input.edition,
        });
        serverIcon = status.icon;
      } catch {
        // Ownership validation already succeeded; an unavailable icon should not block registration.
      }
    }
    const server = await serverRegistrationService.create({
      ownerId: request.user!.id,
      input: { ...input, hostname: normalizeServerHostname(input.hostname) },
      slug,
      serverIcon,
      verificationParent,
    });
    return reply.code(201).send(server);
  });
  app.post("/v1/servers/validate-address", { preHandler: app.authenticate }, async (request) => {
    const input = ServerAddressValidationSchema.parse(request.body);
    const hostname = normalizeServerHostname(input.hostname);
    const [sameOwnerRegistration, claimedRegistration] = await Promise.all([
      prisma.server.findFirst({
        where: {
          ownerId: request.user!.id,
          edition: input.edition,
          normalizedHostname: hostname,
          port: input.port,
          verificationStatus: { not: "EXPIRED" },
        },
        select: { id: true },
      }),
      prisma.server.findFirst({
        where: {
          edition: input.edition,
          normalizedHostname: hostname,
          port: input.port,
          claimed: true,
        },
        select: { id: true },
      }),
    ]);
    if (sameOwnerRegistration) {
      throw new Error("This server address is already registered on your Nortix account.");
    }
    if (claimedRegistration) {
      throw new Error("This server address has already been claimed.");
    }
    let status;
    try {
      status = await mcStatusClient.getStatus({
        hostname,
        port: input.port,
        edition: input.edition,
      });
    } catch (error) {
      if (error instanceof McsrvstatRequestError) {
        throw new Error(
          "The public server address could not be validated. Make sure it is reachable and try again.",
        );
      }
      throw error;
    }
    if (!status.online) {
      throw new Error("The public server address did not return a live Minecraft server.");
    }
    const expiresAt = Date.now() + SERVER_VALIDATION_TTL_MS;
    const payload = validationPayload(
      request.user!.id,
      hostname,
      input.port,
      input.edition,
      expiresAt,
    );
    return {
      hostname,
      port: input.port,
      edition: input.edition,
      preview: {
        online: status.online,
        playerCount: status.playerCount,
        maxPlayers: status.maxPlayers,
        version: status.version,
        icon: status.icon,
      },
      validationSignature: `${expiresAt}.${signServerValidation(payload, env.SERVER_VALIDATION_SECRET)}`,
      expiresAt: new Date(expiresAt).toISOString(),
    };
  });
  app.post(
    "/v1/servers/:id/verification",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { platform } = CreateServerVerificationSchema.parse(request.body);
      return reply
        .code(201)
        .send(await serverVerificationService.create(id, request.user!.id, platform));
    },
  );
  app.get("/v1/servers/:id/verification", { preHandler: app.authenticate }, async (request) => {
    const { id } = request.params as { id: string };
    return serverVerificationService.getOwned(id, request.user!.id);
  });
  app.post(
    "/v1/servers/:id/verification/check",
    { preHandler: app.authenticate },
    async (request) => {
      const { id } = request.params as { id: string };
      return serverVerificationService.verify(id, request.user!.id, request.id);
    },
  );
  app.post("/v1/plugin/verifications/handshake", async (request) => {
    const input = PluginVerificationHandshakeSchema.parse(request.body);
    return serverVerificationService.pluginHandshake({
      ...input,
      code: input.code.toUpperCase(),
    });
  });
  app.get("/v1/plugin/verifications/status", async (request) => {
    const input = PluginVerificationStatusSchema.parse(request.query);
    return serverVerificationService.pluginStatus(input.code.toUpperCase(), input.platform);
  });

  app.post(
    "/v1/owner/servers/:id/plugin-credentials",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const server = await requireOwnedServer(id, request.user!.id);
      if (!server.claimed || server.verificationStatus !== "VERIFIED") {
        throw new Error("Server verification is required before connecting milestone tracking.");
      }
      const previousCredentials = await prisma.integrationApiKey.findMany({
        where: { serverId: id, scopes: { has: "plugin:events" }, revokedAt: null },
        select: { id: true, algorithm: true, lastFour: true },
      });
      const keyPair = generatePluginKeyPair();
      const credential = await prisma.$transaction(async (tx) => {
        await tx.integrationApiKey.updateMany({
          where: { serverId: id, scopes: { has: "plugin:events" }, revokedAt: null },
          data: { revokedAt: new Date() },
        });
        const created = await tx.integrationApiKey.create({
          data: {
            serverId: id,
            name: "Nortix Minecraft integration",
            algorithm: keyPair.algorithm,
            publicKey: keyPair.publicKey,
            scopes: ["plugin:events", "plugin:capabilities"],
            lastFour: keyPair.publicKey.slice(-4),
          },
        });
        await tx.server.update({
          where: { id },
          data: { pluginInstanceId: null, pluginLastSeenAt: null },
        });
        await tx.auditLog.create({
          data: {
            actorId: request.user!.id,
            action: "server.plugin_signing_key_rotated",
            entityType: "Server",
            entityId: id,
            requestId: request.id,
            beforeSnapshot: { activeCredentials: previousCredentials },
            afterSnapshot: {
              keyId: created.id,
              algorithm: keyPair.algorithm,
              publicKeyFingerprint: keyPair.publicKey.slice(-16),
            },
            reason: "Owner generated a new server-bound plugin signing key.",
          },
        });
        return created;
      });
      return reply
        .header("Cache-Control", "no-store")
        .header("Pragma", "no-cache")
        .send({
          serverId: id,
          serverName: server.name,
          keyId: credential.id,
          algorithm: keyPair.algorithm,
          privateKey: keyPair.privateKey,
          publicKey: keyPair.publicKey,
          shownOnce: true,
        });
    },
  );

  app.get(
    "/v1/owner/servers/:id/store",
    { preHandler: app.authenticate },
    async (request) => {
      const { id } = request.params as { id: string };
      await requireServerPermission(id, request.user!.id, "store");
      return serverStoreService.ownerStore(id);
    },
  );

  app.put(
    "/v1/owner/servers/:id/store",
    { preHandler: app.authenticate },
    async (request) => {
      const { id } = request.params as { id: string };
      await requireServerPermission(id, request.user!.id, "store");
      const input = OwnerServerStoreInputSchema.parse(request.body);
      return serverStoreService.upsertStore(request.user!.id, id, input, request.id);
    },
  );

  app.post(
    "/v1/owner/servers/:id/store/items",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      await requireServerPermission(id, request.user!.id, "store");
      const input = OwnerServerStoreItemInputSchema.parse(request.body);
      return reply
        .code(201)
        .send(await serverStoreService.createItem(request.user!.id, id, input, request.id));
    },
  );

  app.post(
    "/v1/owner/servers/:id/store/media",
    {
      preHandler: app.authenticate,
      bodyLimit: MAX_STORE_IMAGE_BYTES,
      config: { rateLimit: { max: 30, timeWindow: "1 hour" } },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      await requireServerPermission(id, request.user!.id, "store");
      if (!Buffer.isBuffer(request.body)) {
        throw new Error("A PNG, JPEG, or WebP store image is required.");
      }
      const contentType = request.headers["content-type"]?.split(";")[0]?.trim().toLowerCase();
      return reply
        .code(201)
        .send(
          await serverStoreMediaService.upload(
            id,
            request.user!.id,
            request.body,
            contentType,
            request.id,
          ),
        );
    },
  );

  app.patch(
    "/v1/owner/servers/:id/store/items/:itemId",
    { preHandler: app.authenticate },
    async (request) => {
      const { id, itemId } = request.params as { id: string; itemId: string };
      await requireServerPermission(id, request.user!.id, "store");
      const input = OwnerServerStoreItemUpdateSchema.parse(request.body);
      return serverStoreService.updateItem(request.user!.id, id, itemId, input, request.id);
    },
  );

  app.get(
    "/v1/owner/servers/:id/store/purchases",
    { preHandler: app.authenticate },
    async (request) => {
      const { id } = request.params as { id: string };
      await requireServerPermission(id, request.user!.id, "analytics");
      return serverStoreService.ownerPurchases(id);
    },
  );

  app.get("/v1/owner/store-sales", { preHandler: app.authenticate }, (request) =>
    serverStoreService.ownerSales(request.user!.id),
  );

  app.post(
    "/v1/owner/store-payouts",
    {
      preHandler: app.authenticate,
      config: { rateLimit: { max: 5, timeWindow: "1 hour" } },
    },
    async (request, reply) => {
      const input = OwnerServerStorePayoutInputSchema.parse(request.body);
      return reply
        .code(202)
        .send(
          await serverStoreService.requestPayout(
            request.user!.id,
            input,
            request.id,
          ),
        );
    },
  );

  app.get(
    "/v1/owner/servers/:id/plugin-capabilities",
    { preHandler: app.authenticate },
    async (request) => {
      const { id } = request.params as { id: string };
      await requireServerPermission(id, request.user!.id, "integrations");
      return prisma.server.findUniqueOrThrow({
        where: { id },
        select: {
          id: true,
          name: true,
          verificationParentId: true,
          pluginCapabilities: true,
          pluginLastSeenAt: true,
          pluginInstanceId: true,
        },
      });
    },
  );

  app.get(
    "/v1/owner/servers/:id/campaign-suggestions",
    { preHandler: app.authenticate },
    async (request) => {
      const { id } = request.params as { id: string };
      await requireServerPermission(id, request.user!.id, "campaigns");
      const query = request.query as {
        budgetCredits?: string;
        maximumSparksReward?: string;
      };
      const boundedInteger = (
        value: string | undefined,
        fallback: number,
        minimum: number,
        maximum: number,
      ) => {
        const parsed = Number(value);
        return Number.isFinite(parsed)
          ? Math.max(minimum, Math.min(maximum, Math.floor(parsed)))
          : fallback;
      };
      const budgetCredits = boundedInteger(query.budgetCredits, 5_000, 100, 10_000_000);
      const maximumSparksReward = boundedInteger(query.maximumSparksReward, 100, 10, 2_000);
      const capacity = deriveCampaignCapacity({
        budgetCredits,
        maximumSparksReward,
        milestoneCount: 1,
      });
      const server = await prisma.server.findUniqueOrThrow({
        where: { id },
        select: {
          playerCount: true,
          verificationScope: true,
          verificationParentId: true,
          pluginCapabilities: true,
        },
      });
      const capabilities = Array.isArray(server.pluginCapabilities)
        ? server.pluginCapabilities
        : [];
      const advertisedMetrics = capabilities.flatMap((capability) => {
        if (!capability || typeof capability !== "object" || !("metrics" in capability)) {
          return [];
        }
        const metrics = (capability as { metrics?: unknown }).metrics;
        return Array.isArray(metrics)
          ? metrics.filter((metric): metric is string => typeof metric === "string")
          : [];
      });
      return {
        exposure: estimatePotentialExposure(capacity.capacity, server.playerCount),
        derivedCapacity: capacity.capacity,
        estimatedCostPerPotentialParticipant: capacity.costPerPotentialParticipant,
        suggestions: suggestCampaignMilestones(
          advertisedMetrics,
          server.verificationScope === "PROXY_NETWORK" || Boolean(server.verificationParentId),
        ),
      };
    },
  );

  app.get(
    "/v1/owner/servers/:id/campaign-eligibility",
    { preHandler: app.authenticate },
    async (request) => {
      const { id } = request.params as { id: string };
      await requireServerPermission(id, request.user!.id, "campaigns");
      const since = new Date(Date.now() - CAMPAIGN_ACTIVITY_WINDOW_DAYS * 86_400_000);
      const samples = await prisma.serverActivitySample.findMany({
        where: { serverId: id, observedAt: { gte: since } },
        select: { onlinePlayers: true, observedAt: true },
      });
      return evaluateCampaignEligibility(samples);
    },
  );

  app.post("/v1/plugin/capabilities", async (request) => {
    const input = PluginCapabilitiesHandshakeSchema.parse(request.body);
    await authenticateSignedPluginRequest(
      request,
      input.serverId,
      "plugin:capabilities",
    );
    const server = await prisma.server.update({
      where: { id: input.serverId },
      data: {
        pluginCapabilities: input.capabilities,
        pluginLastSeenAt: new Date(),
        pluginInstanceId: input.instanceId,
      },
      select: { id: true, name: true, verificationParentId: true },
    });
    return {
      accepted: true,
      serverId: server.id,
      networkId: server.verificationParentId ?? server.id,
      capabilities: input.capabilities.length,
    };
  });

  app.post(
    "/v1/plugin/player-history",
    { config: { rateLimit: { max: 120, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const input = PluginPlayerHistorySchema.parse(request.body);
      const credential = await authenticateSignedPluginRequest(request, input.serverId);
      if (credential.server.pluginInstanceId !== input.instanceId) {
        throw new Error("Plugin instance verification is required before syncing player history.");
      }
      const result = await prisma.$transaction(async (tx) => {
        const inserted = input.players.length
          ? await tx.serverPlayerPresence.createMany({
              data: input.players.map((player) => ({
                serverId: input.serverId,
                normalizedUsername: player.minecraftUsername.toLowerCase(),
                minecraftUsername: player.minecraftUsername,
                firstSeenAt: new Date(player.firstSeenAt),
                lastSeenAt: new Date(player.firstSeenAt),
              })),
              skipDuplicates: true,
            })
          : { count: 0 };
        if (input.complete) {
          await tx.server.update({
            where: { id: input.serverId },
            data: { playerHistorySyncedAt: new Date() },
          });
        }
        return inserted;
      });
      return reply.code(202).send({ accepted: true, recorded: result.count });
    },
  );

  app.post(
    "/v1/plugin/cracked-claims/complete",
    { config: { rateLimit: { max: 30, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const input = PluginCrackedClaimCompletionSchema.parse(request.body);
      const credential = await authenticateSignedPluginRequest(request, input.serverId);
      if (credential.server.pluginInstanceId !== input.instanceId) {
        throw new Error("Plugin instance verification is required before completing a claim.");
      }
      const occurredAt = new Date(input.occurredAt);
      if (Math.abs(Date.now() - occurredAt.getTime()) > 5 * 60_000) {
        throw new Error("Cracked account claims must be completed from a current server session.");
      }
      const link = await minecraftIdentityService.completeCrackedClaim(
        input.serverId,
        input.claimCode,
        input.minecraftUsername,
        occurredAt,
      );
      return reply.code(200).send({
        linked: true,
        minecraftUsername: link.minecraftUsername,
        inactiveAfter: link.expiresAt,
      });
    },
  );

  app.post(
    "/v1/plugin/presence",
    { config: { rateLimit: { max: 4, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const input = PluginPresenceSnapshotSchema.parse(request.body);
      const credential = await authenticateSignedPluginRequest(request, input.serverId);
      if (!credential.server.pluginInstanceId && input.platform === "VELOCITY") {
        await prisma.server.update({
          where: { id: input.serverId },
          data: { pluginInstanceId: input.instanceId, pluginLastSeenAt: new Date() },
        });
      } else if (credential.server.pluginInstanceId !== input.instanceId) {
        throw new Error("Plugin instance verification is required before activity reporting.");
      }
      const observedAt = new Date(input.observedAt);
      if (Math.abs(Date.now() - observedAt.getTime()) > 5 * 60_000) {
        throw new Error("Presence snapshots must use a current observation time.");
      }
      const backendCounts = input.players.reduce<Record<string, number>>((counts, player) => {
        const backend = player.backend ?? "default";
        counts[backend] = (counts[backend] ?? 0) + 1;
        return counts;
      }, {});
      const playerHashes = [
        ...new Set(
          input.players.map((player) =>
            createHash("sha256")
              .update(`${input.serverId}:${player.minecraftUuid.toLowerCase()}`)
              .digest("hex"),
          ),
        ),
      ];
      const stored = await prisma.$transaction(async (tx) => {
        const sample = await tx.serverActivitySample.upsert({
          where: { id: input.id },
          update: {},
          create: {
            id: input.id,
            serverId: input.serverId,
            observedAt,
            onlinePlayers: input.onlinePlayers,
            maxPlayers: input.maxPlayers,
            platform: input.platform,
            pluginVersion: input.pluginVersion,
            serverVersion: input.serverVersion,
            backendCounts,
            playerHashes,
          },
          select: { id: true },
        });
        await tx.server.update({
          where: { id: input.serverId },
          data: {
            online: true,
            playerCount: input.onlinePlayers,
            maxPlayers: input.maxPlayers,
            pluginLastSeenAt: new Date(),
          },
        });
        await tx.serverActivitySample.deleteMany({
          where: {
            serverId: input.serverId,
            observedAt: { lt: new Date(Date.now() - 14 * 86_400_000) },
          },
        });
        return sample;
      });
      return reply.code(202).send({ accepted: true, sampleId: stored.id });
    },
  );

  app.get(
    "/v1/plugin/public-profiles/:minecraftUsername",
    { config: { rateLimit: { max: 120, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const { minecraftUsername } = z
        .object({
          minecraftUsername: z.string().regex(/^[A-Za-z0-9_]{3,16}$/),
        })
        .parse(request.params);
      const serverId = z
        .string()
        .min(1)
        .parse((request.query as { serverId?: string }).serverId);
      await authenticateSignedPluginRequest(request, serverId);
      const accountSelect = {
        username: true,
        displayName: true,
        reputationScore: true,
        reputationTier: true,
        testerLevel: true,
      } satisfies Prisma.UserSelect;
      const premium = await prisma.minecraftIdentity.findFirst({
        where: {
          verified: true,
          OR: [
            { username: { equals: minecraftUsername, mode: "insensitive" } },
            { lastKnownUsername: { equals: minecraftUsername, mode: "insensitive" } },
          ],
        },
        select: { username: true, user: { select: accountSelect } },
      });
      const cracked = premium
        ? null
        : await prisma.crackedAccountLink.findFirst({
            where: {
              serverId,
              normalizedUsername: minecraftUsername.toLowerCase(),
              status: "ACTIVE",
            },
            select: { minecraftUsername: true, user: { select: accountSelect } },
          });
      const identity = premium ?? cracked;
      if (!identity) {
        return reply.code(404).send({
          code: "PROFILE_NOT_FOUND",
          message: "This user is not registered to Nortix.",
        });
      }
      const user = identity.user;
      const verifiedMilestones = await prisma.milestoneCompletion.count({
        where: {
          status: "VERIFIED",
          participation: { player: { username: user.username } },
        },
      });
      return {
        minecraftUsername: "username" in identity ? identity.username : identity.minecraftUsername,
        nortixUsername: user.username,
        displayName: user.displayName,
        reputationScore: user.reputationScore,
        reputationTier: user.reputationTier,
        testerLevel: user.testerLevel,
        verifiedMilestones,
      };
    },
  );

  app.get(
    "/v1/plugin/store-deliveries/next",
    { config: { rateLimit: { max: 30, timeWindow: "1 minute" } } },
    async (request) => {
      const input = PluginStoreDeliveryQuerySchema.parse(request.query);
      await authenticateSignedPluginRequest(request, input.serverId);
      return { delivery: await serverStoreService.claimNextDelivery(input.serverId) };
    },
  );

  app.post(
    "/v1/plugin/store-deliveries/result",
    { config: { rateLimit: { max: 60, timeWindow: "1 minute" } } },
    async (request) => {
      const input = PluginStoreDeliveryResultSchema.parse(request.body);
      await authenticateSignedPluginRequest(request, input.serverId);
      return serverStoreService.completeDelivery(
        input.serverId,
        input.deliveryId,
        input.success,
        input.error,
        request.id,
      );
    },
  );

  app.post(
    "/v1/plugin/events",
    { config: { rateLimit: { max: 600, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const input = ServerPluginEventSchema.parse(request.body);
      const credential = await authenticateSignedPluginRequest(request, input.serverId);
      const capabilities = Array.isArray(credential.server.pluginCapabilities)
        ? credential.server.pluginCapabilities
        : [];
      const advertisedMetrics = capabilities.flatMap((capability) => {
        if (!capability || typeof capability !== "object" || !("metrics" in capability)) return [];
        const metrics = (capability as { metrics?: unknown }).metrics;
        return Array.isArray(metrics)
          ? metrics.filter((metric): metric is string => typeof metric === "string")
          : [];
      });
      const validated = validatePluginEvent(input, {
        boundInstanceId: credential.server.pluginInstanceId,
        advertisedMetrics,
      });
      const existing = await prisma.analyticsEvent.findUnique({
        where: { id: input.id },
        select: { id: true, serverId: true },
      });
      if (existing?.serverId !== undefined && existing.serverId !== input.serverId)
        throw new Error("Plugin event identifier is already in use.");
      const server = credential.server;
      const stored =
        existing ??
        (await prisma.analyticsEvent.create({
          data: {
            id: input.id,
            serverId: input.serverId,
            source: "SERVER_PLUGIN",
            type: input.type,
            occurredAt: validated.occurredAt,
            metadata: {
              ...validated.metadata,
              minecraftUuid: input.minecraftUuid,
              minecraftUsername: input.minecraftUsername,
              instanceId: input.instanceId,
              attestation: "UNTRUSTED_SERVER_PLUGIN",
            },
          },
          select: { id: true, serverId: true },
        }));

      const activatedLink =
        input.type === "PLAYER_JOIN"
          ? await minecraftIdentityService.observeServerJoin(
              input.serverId,
              input.minecraftUsername,
              validated.occurredAt,
            )
          : null;
      const [identity, existingCrackedLink] = await Promise.all([
        prisma.minecraftIdentity.findUnique({ where: { uuid: input.minecraftUuid } }),
        prisma.crackedAccountLink.findFirst({
          where: {
            serverId: input.serverId,
            normalizedUsername: input.minecraftUsername.toLowerCase(),
            status: "ACTIVE",
          },
        }),
      ]);
      const crackedLink = activatedLink ?? existingCrackedLink;
      const matchedUserIds = [
        ...new Set([identity?.userId, crackedLink?.userId].filter((id): id is string => Boolean(id))),
      ];
      if (matchedUserIds.length === 1) {
        await gameplayService.recordPluginEvent({
          eventId: stored.id,
          userId: matchedUserIds[0]!,
          serverId: input.serverId,
          type: input.type,
          occurredAt: validated.occurredAt,
          metadata: validated.metadata,
        });
      }
      if (input.type === "PLAYER_JOIN") {
        for (const joinedUserId of matchedUserIds) {
          await activityService.record(joinedUserId, "VERIFIED_SERVER_JOIN", validated.occurredAt);
          await questService.evaluateAndAward(joinedUserId);
        }
      }
      if (existing) {
        return reply.code(202).send({ accepted: true, eventId: existing.id, duplicate: true });
      }
      if (!identity && !crackedLink) {
        return reply
          .code(202)
          .send({ accepted: true, eventId: stored.id, matchedParticipations: 0 });
      }
      const serverIds = [server.id];
      if (server.verificationParentId) serverIds.push(server.verificationParentId);
      else {
        const children = await prisma.server.findMany({
          where: { verificationParentId: server.id },
          select: { id: true },
        });
        serverIds.push(...children.map((item) => item.id));
      }
      const participations = await prisma.campaignParticipation.findMany({
        where: {
          OR: [
            ...(identity ? [{ minecraftIdentityId: identity.id }] : []),
            ...(crackedLink ? [{ crackedAccountLinkId: crackedLink.id }] : []),
          ],
          status: { in: ["JOINED", "ACTIVE"] },
          campaign: { serverId: { in: serverIds } },
        },
        include: { campaign: { include: { milestones: true } } },
      });
      let completed = 0;
      for (const participation of participations) {
        for (const milestone of participation.campaign.milestones) {
          if (milestone.verificationMethod !== "SERVER_PLUGIN") continue;
          const config = {
            ...(milestone.verificationConfig as Record<string, unknown>),
            ...(milestone.completionRequirements as Record<string, unknown>),
          };
          const metric = String(config.metric ?? milestone.templateType).toUpperCase();
          const target = Math.max(1, Number(config.target ?? 1));
          const scopedIds = config.scope === "PROXY_NETWORK" ? serverIds : [input.serverId];
          const events = await prisma.analyticsEvent.findMany({
            where: {
              serverId: { in: scopedIds },
              occurredAt: { gte: participation.joinedAt },
              ...(participation.crackedAccountLinkId
                ? { metadata: { path: ["minecraftUsername"], equals: input.minecraftUsername } }
                : { metadata: { path: ["minecraftUuid"], equals: input.minecraftUuid } }),
            },
            select: { type: true, metadata: true, occurredAt: true },
            orderBy: { occurredAt: "desc" },
            take: 10_000,
          });
          const relevant = events.filter((item) => {
            const data = item.metadata as Record<string, unknown>;
            if (
              metric === "PLAYER_KILLS" ||
              metric === "UNIQUE_PLAYER_KILLS" ||
              metric === "PVP_STREAK"
            )
              return item.type === "PLAYER_KILL";
            if (metric === "MOB_KILLS")
              return (
                item.type === "MOB_KILL" &&
                (!config.entityType || data.entityType === config.entityType)
              );
            if (metric === "BLOCKS_BROKEN")
              return (
                item.type === "BLOCK_BREAK" &&
                (!config.material || data.material === config.material)
              );
            if (metric === "PLAYTIME_SECONDS") return item.type === "PLAYTIME";
            return item.type === "METRIC_SNAPSHOT" && data.metric === metric;
          });
          let value = relevant.length;
          if (metric === "UNIQUE_PLAYER_KILLS")
            value = new Set(
              relevant.map((item) =>
                String((item.metadata as Record<string, unknown>).victimUuid ?? ""),
              ),
            ).size;
          else if (metric === "PLAYTIME_SECONDS")
            value = relevant.reduce(
              (total, item) =>
                total + Number((item.metadata as Record<string, unknown>).seconds ?? 0),
              0,
            );
          else if (
            ["SKYBLOCK_LEVEL", "ISLAND_WORTH", "LIFESTEAL_HEARTS", "SKILL_LEVEL"].includes(metric)
          )
            value = Number(
              (relevant[0]?.metadata as Record<string, unknown> | undefined)?.value ?? 0,
            );
          else if (metric === "PVP_STREAK") {
            value = 0;
            for (const item of relevant)
              value = Math.max(
                value,
                Number((item.metadata as Record<string, unknown>).streak ?? 0),
              );
          }
          if (value >= target) {
            const automaticallyApproved = canAutomaticallyApprovePluginMilestone({
              verificationMethod: milestone.verificationMethod,
              reviewRequired: milestone.reviewRequired,
              metric,
              target,
              observed: value,
              eventCount: relevant.length,
              firstObservedAt: relevant.at(-1)?.occurredAt,
              lastObservedAt: relevant[0]?.occurredAt,
            });
            await campaignService.recordPluginMilestone({
              participationId: participation.id,
              milestoneId: milestone.id,
              evidence: {
                metric,
                target,
                observed: value,
                eventCount: relevant.length,
                firstObservedAt: relevant.at(-1)?.occurredAt.toISOString(),
                lastObservedAt: relevant[0]?.occurredAt.toISOString(),
                serverIds: scopedIds,
                backendCalculated: true,
                safeguards: {
                  authenticatedServerCredential: true,
                  boundPluginInstance: true,
                  schemaValidated: true,
                  idempotentEventIds: true,
                  plausibleEventRate: automaticallyApproved,
                },
                attestation: "UNTRUSTED_SERVER_PLUGIN",
              },
              automaticallyApproved,
            });
            completed++;
          }
        }
        await prisma.campaignParticipation.update({
          where: { id: participation.id },
          data: { status: "ACTIVE", lastActivityAt: new Date() },
        });
        await activityService.record(participation.playerId, "CAMPAIGN_PLAY", validated.occurredAt);
        await questService.evaluateAndAward(participation.playerId);
      }
      await prisma.server.update({
        where: { id: input.serverId },
        data: { pluginLastSeenAt: new Date(), pluginInstanceId: input.instanceId },
      });
      return reply.code(202).send({
        accepted: true,
        eventId: stored.id,
        matchedParticipations: participations.length,
        milestonesReached: completed,
      });
    },
  );

  app.get("/v1/campaigns", async (request) => {
    const { page, pageSize } = parsePagination(request.query as Record<string, unknown>);
    const where = {
      status: "ACTIVE" as const,
      startsAt: { lte: new Date() },
      endsAt: { gt: new Date() },
      server: {
        publicListing: true,
        moderationStatus: "APPROVED" as const,
        edition: "JAVA" as const,
      },
    };
    const [items, total] = await prisma.$transaction([
      prisma.campaign.findMany({
        where,
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          category: true,
          startsAt: true,
          endsAt: true,
          maxParticipants: true,
          minimumSparksReward: true,
          maximumSparksReward: true,
          potentialExposureMin: true,
          potentialExposureMax: true,
          automaticVerification: true,
          versionRequirements: true,
          regionRestrictions: true,
          server: { select: publicServerSelect },
          milestones: { select: publicMilestoneSelect, orderBy: { order: "asc" } },
          _count: { select: { participations: true } },
        },
        orderBy: [{ publishedAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.campaign.count({ where }),
    ]);
    return { items, page, pageSize, total };
  });
  app.get("/v1/campaigns/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const campaign = await prisma.campaign.findFirst({
      where: {
        id,
        status: { in: ["ACTIVE", "SCHEDULED", "COMPLETED"] },
        server: { publicListing: true, moderationStatus: "APPROVED", edition: "JAVA" },
      },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        category: true,
        startsAt: true,
        endsAt: true,
        maxParticipants: true,
        minimumSparksReward: true,
        maximumSparksReward: true,
        potentialExposureMin: true,
        potentialExposureMax: true,
        automaticVerification: true,
        versionRequirements: true,
        regionRestrictions: true,
        server: { select: publicServerSelect },
        milestones: { select: publicMilestoneSelect, orderBy: { order: "asc" } },
        _count: { select: { participations: true } },
      },
    });
    return campaign ?? reply.code(404).send({ code: "NOT_FOUND", message: "Campaign not found." });
  });
  app.post("/v1/campaigns/:id/join", { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = JoinCampaignSchema.parse(request.body);
    const result = await campaignService.join(
      request.user!.id,
      id,
      input.minecraftIdentityId,
      input.crackedAccountLinkId,
    );
    await questService.evaluateAndAward(request.user!.id);
    return reply.code(201).send(result);
  });
  app.get("/v1/campaigns/:id/participation", { preHandler: app.authenticate }, async (request) => {
    const { id } = request.params as { id: string };
    return prisma.campaignParticipation.findUnique({
      where: { playerId_campaignId: { playerId: request.user!.id, campaignId: id } },
      include: {
        completions: true,
        campaign: {
          select: {
            id: true,
            title: true,
            description: true,
            status: true,
            category: true,
            startsAt: true,
            endsAt: true,
            minimumSparksReward: true,
            maximumSparksReward: true,
            automaticVerification: true,
            server: { select: publicServerSelect },
            milestones: { select: publicMilestoneSelect, orderBy: { order: "asc" } },
          },
        },
      },
    });
  });

  app.get("/v1/participations", { preHandler: app.authenticate }, async (request) =>
    prisma.campaignParticipation.findMany({
      where: { playerId: request.user!.id },
      include: {
        campaign: {
          select: {
            id: true,
            title: true,
            description: true,
            status: true,
            category: true,
            startsAt: true,
            endsAt: true,
            minimumSparksReward: true,
            maximumSparksReward: true,
            automaticVerification: true,
            server: { select: publicServerSelect },
            milestones: { select: publicMilestoneSelect, orderBy: { order: "asc" } },
          },
        },
        completions: true,
      },
      orderBy: { lastActivityAt: "desc" },
    }),
  );
  app.post(
    "/v1/participations/:id/milestones/:milestoneId/submit",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const { id, milestoneId } = request.params as { id: string; milestoneId: string };
      const input = MilestoneSubmissionSchema.parse(request.body);
      const completion = await campaignService.submitMilestone(request.user!.id, id, milestoneId, {
        ...input.evidence,
        note: input.note,
      });
      await questService.evaluateAndAward(request.user!.id);
      return reply.code(201).send(completion);
    },
  );

  app.get("/v1/sparks/summary", { preHandler: app.authenticate }, async (request) => {
    await questService.evaluateAndAward(request.user!.id);
    const entries = await prisma.sparksLedgerEntry.findMany({
      where: { userId: request.user!.id },
    });
    const balance = entries.reduce(
      (total, entry) => total + (entry.direction === "CREDIT" ? entry.amount : -entry.amount),
      0,
    );
    return { balance };
  });
  app.get("/v1/sparks/transactions", { preHandler: app.authenticate }, async (request) =>
    prisma.sparksLedgerEntry.findMany({
      where: { userId: request.user!.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  );
  app.get("/v1/quests", async (request, reply) => {
    if (request.headers.authorization || request.headers["x-mock-user"]) {
      await app.authenticate(request, reply);
      if (reply.sent) return;
    }
    if (request.user) return questService.evaluateAndAward(request.user.id);
    const quests = await prisma.dailyQuest.findMany({
      where: { active: true },
      orderBy: { title: "asc" },
    });
    return quests.map((quest) => ({
      ...quest,
      progress: 0,
      completedAt: null,
      verificationPending: quest.type === "DISCORD_JOIN",
    }));
  });
  app.get("/v1/sparks/shop", async () =>
    prisma.cosmeticItem.findMany({
      where: { available: true, unlockMethod: "SPARKS" },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        type: true,
        sparksPrice: true,
        rarity: true,
        season: true,
        preview: true,
      },
      orderBy: { sparksPrice: "asc" },
    }),
  );
  app.post(
    "/v1/sparks/purchases",
    {
      preHandler: app.authenticate,
      config: { rateLimit: { max: 20, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const { itemId } = sparksPurchaseSchema.parse(request.body);
      const purchase = await cosmeticService.purchase(request.user!.id, itemId);
      await questService.evaluateAndAward(request.user!.id);
      return reply.code(201).send(purchase);
    },
  );
  app.get("/v1/profile/cosmetics", { preHandler: app.authenticate }, async (request) =>
    cosmeticService.collection(request.user!.id),
  );
  app.get("/v1/profile/activity", { preHandler: app.authenticate }, async (request) =>
    cosmeticService.activity(request.user!.id),
  );
  const checkInAndReadStreak = async (userId: string) => {
    const streak = await activityService.checkInAndStreak(userId);
    try {
      await questService.evaluateAndAward(userId);
    } catch (error) {
      app.log.error(
        { err: error, userId },
        "Daily quest evaluation failed after the web activity check-in.",
      );
    }
    return streak;
  };
  app.post(
    "/v1/profile/activity/check-in",
    { preHandler: app.authenticate, config: { rateLimit: { max: 30, timeWindow: "1 minute" } } },
    (request) => checkInAndReadStreak(request.user!.id),
  );
  app.post(
    "/v1/profile/activity/streak",
    { preHandler: app.authenticate, config: { rateLimit: { max: 30, timeWindow: "1 minute" } } },
    (request) => checkInAndReadStreak(request.user!.id),
  );
  app.get("/v1/profile/activity/streak", { preHandler: app.authenticate }, async (request) =>
    activityService.streak(request.user!.id),
  );
  app.put(
    "/v1/profile/cosmetics/equipped",
    {
      preHandler: app.authenticate,
      config: { rateLimit: { max: 60, timeWindow: "1 minute" } },
    },
    async (request) => {
      const { itemId } = EquipCosmeticInputSchema.parse(request.body);
      return cosmeticService.equip(request.user!.id, itemId);
    },
  );
  app.delete(
    "/v1/profile/cosmetics/equipped",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const { type } = UnequipCosmeticInputSchema.parse(request.body);
      await cosmeticService.unequip(request.user!.id, type);
      return reply.code(204).send();
    },
  );

  app.get("/v1/owner/servers", { preHandler: app.authenticate }, async (request) => {
    const userId = request.user!.id;
    const servers = await prisma.server.findMany({
      where: { OR: [{ ownerId: userId }, { teamMembers: { some: { userId } } }] },
      select: {
        id: true,
        ownerId: true,
        name: true,
        slug: true,
        description: true,
        hostname: true,
        port: true,
        versions: true,
        edition: true,
        categories: true,
        tags: true,
        logoUrl: true,
        bannerUrl: true,
        screenshotUrls: true,
        discordUrl: true,
        websiteUrl: true,
        verificationStatus: true,
        verificationScope: true,
        verificationParentId: true,
        moderationStatus: true,
        claimed: true,
        online: true,
        publicListing: true,
        rewardedVotingEnabled: true,
        playerCount: true,
        maxPlayers: true,
        pluginLastSeenAt: true,
        pluginInstanceId: true,
        createdAt: true,
        updatedAt: true,
        owner: { select: { id: true, username: true, displayName: true } },
        teamMembers: { where: { userId }, select: { role: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
    return servers.map(({ teamMembers, pluginInstanceId, pluginLastSeenAt, ...server }) => {
      const membership = teamMembers[0];
      return {
        ...server,
        plugin: presentOwnerPluginState({ pluginInstanceId, pluginLastSeenAt }),
        access:
          server.ownerId === userId
            ? {
                type: "OWNER",
                role: "OWNER",
                permissions: ["analytics", "campaigns", "integrations", "settings", "store", "team"],
              }
            : {
                type: "TEAM",
                role: membership!.role,
                permissions: teamPermissions[membership!.role],
              },
      };
    });
  });
  app.delete(
    "/v1/owner/servers/:serverId/registration",
    {
      preHandler: app.authenticate,
      config: { rateLimit: { max: 10, timeWindow: "1 hour" } },
    },
    async (request) => {
      const { serverId } = request.params as { serverId: string };
      const input = DeleteServerRegistrationSchema.parse(request.body);
      return serverRegistrationService.deleteRegistration(
        request.user!.id,
        serverId,
        input,
        request.id,
      );
    },
  );
  app.put(
    "/v1/owner/servers/:serverId/rewarded-voting",
    { preHandler: app.authenticate },
    async (request) => {
      const { serverId } = request.params as { serverId: string };
      const input = ServerRewardedVotingSettingSchema.parse(request.body);
      const server = await requireServerPermission(serverId, request.user!.id, "settings");
      return prisma.$transaction(async (tx) => {
        const updated = await tx.server.update({
          where: { id: serverId },
          data: { rewardedVotingEnabled: input.rewardedVotingEnabled },
          select: { id: true, rewardedVotingEnabled: true },
        });
        await tx.auditLog.create({
          data: {
            actorId: request.user!.id,
            action: "server.settings.rewarded_voting_updated",
            entityType: "Server",
            entityId: serverId,
            requestId: request.id,
            beforeSnapshot: { rewardedVotingEnabled: server.rewardedVotingEnabled },
            afterSnapshot: { rewardedVotingEnabled: updated.rewardedVotingEnabled },
          },
        });
        return updated;
      });
    },
  );
  app.get("/v1/sparks/sponsored-stores", { preHandler: app.authenticate }, () =>
    sponsoredShopService.catalog(),
  );
  app.get("/v1/sparks/sponsored-purchases", { preHandler: app.authenticate }, (request) =>
    sponsoredShopService.listMine(request.user!.id),
  );
  app.post(
    "/v1/sparks/sponsored-purchases",
    {
      preHandler: app.authenticate,
      config: { rateLimit: { max: 10, timeWindow: "1 hour" } },
    },
    async (request, reply) => {
      const input = SponsoredPurchaseInputSchema.parse(request.body);
      const purchase = await sponsoredShopService.purchase(request.user!.id, input, request.id);
      await questService.evaluateAndAward(request.user!.id);
      return reply.code(201).send(purchase);
    },
  );
  app.get("/v1/sparks/server-stores", { preHandler: app.authenticate }, () =>
    serverStoreService.catalog(),
  );
  app.get("/v1/sparks/server-store-purchases", { preHandler: app.authenticate }, (request) =>
    serverStoreService.listMine(request.user!.id),
  );
  app.post(
    "/v1/sparks/server-store-purchases",
    {
      preHandler: app.authenticate,
      config: { rateLimit: { max: 20, timeWindow: "1 hour" } },
    },
    async (request, reply) => {
      const input = ServerStorePurchaseInputSchema.parse(request.body);
      const purchase = await serverStoreService.purchase(request.user!.id, input, request.id);
      await questService.evaluateAndAward(request.user!.id);
      return reply.code(201).send(purchase);
    },
  );
  app.post(
    "/v1/sparks/server-store-purchases/:purchaseId/redeem",
    {
      preHandler: app.authenticate,
      config: { rateLimit: { max: 20, timeWindow: "1 hour" } },
    },
    async (request) => {
      const { purchaseId } = request.params as { purchaseId: string };
      const input = ServerStorePurchaseMutationSchema.parse(request.body);
      return serverStoreService.redeem(
        request.user!.id,
        purchaseId,
        input,
        request.id,
      );
    },
  );
  app.post(
    "/v1/sparks/server-store-purchases/:purchaseId/refund",
    {
      preHandler: app.authenticate,
      config: { rateLimit: { max: 10, timeWindow: "1 hour" } },
    },
    async (request) => {
      const { purchaseId } = request.params as { purchaseId: string };
      const input = ServerStorePurchaseMutationSchema.parse(request.body);
      const purchase = await serverStoreService.refund(
        request.user!.id,
        purchaseId,
        input,
        request.id,
      );
      await questService.evaluateAndAward(request.user!.id);
      return purchase;
    },
  );
  app.get("/v1/team/invites", { preHandler: app.authenticate }, async (request) => {
    const now = new Date();
    await prisma.serverTeamInvite.updateMany({
      where: { inviteeId: request.user!.id, status: "PENDING", expiresAt: { lte: now } },
      data: { status: "EXPIRED" },
    });
    return prisma.serverTeamInvite.findMany({
      where: { inviteeId: request.user!.id, status: "PENDING", expiresAt: { gt: now } },
      include: {
        server: {
          select: {
            id: true,
            name: true,
            hostname: true,
            owner: { select: { username: true, displayName: true } },
          },
        },
        inviter: { select: { username: true, displayName: true, avatarUrl: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  });
  app.post(
    "/v1/owner/servers/:serverId/team/invites",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const { serverId } = request.params as { serverId: string };
      const input = ServerTeamInviteInputSchema.parse(request.body);
      const server = await requireOwnedServer(serverId, request.user!.id);
      const invitee = await prisma.user.findFirst({
        where: { username: { equals: input.username, mode: "insensitive" } },
        select: { id: true, username: true, displayName: true, avatarUrl: true },
      });
      if (!invitee)
        return reply
          .code(404)
          .send({ code: "NOT_FOUND", message: "No Nortix account has that username." });
      if (invitee.id === request.user!.id)
        throw new Error("The server owner already has full access.");
      const member = await prisma.serverTeamMember.findUnique({
        where: { serverId_userId: { serverId, userId: invitee.id } },
      });
      if (member) throw new Error("That user is already a team member.");
      const pending = await prisma.serverTeamInvite.findFirst({
        where: {
          serverId,
          inviteeId: invitee.id,
          status: "PENDING",
          expiresAt: { gt: new Date() },
        },
      });
      if (pending) throw new Error("That user already has a pending invite for this server.");
      const invite = await prisma.$transaction(async (tx) => {
        const created = await tx.serverTeamInvite.create({
          data: {
            serverId,
            inviterId: request.user!.id,
            inviteeId: invitee.id,
            role: input.role,
            expiresAt: new Date(Date.now() + 604_800_000),
          },
          include: { invitee: { select: { username: true, displayName: true, avatarUrl: true } } },
        });
        await createNotification(tx, {
          recipientId: invitee.id,
          category: "TEAM",
          title: `Invitation to manage ${server.name}`,
          body: `${request.user!.displayName} invited you as ${input.role.toLowerCase()}. Review the invitation before it expires.`,
          actionUrl: "/owner/settings",
          dedupeKey: `team-invite:${created.id}`,
        });
        return created;
      });
      return reply.code(201).send({ ...invite, server: { id: server.id, name: server.name } });
    },
  );
  app.patch("/v1/team/invites/:inviteId", { preHandler: app.authenticate }, async (request) => {
    const { inviteId } = request.params as { inviteId: string };
    const { action } = TeamInviteResponseSchema.parse(request.body);
    return prisma.$transaction(async (tx) => {
      const invite = await tx.serverTeamInvite.findFirst({
        where: { id: inviteId, inviteeId: request.user!.id },
        include: { server: { select: { name: true } } },
      });
      if (!invite) throw new Error("Team invite not found.");
      if (invite.status !== "PENDING")
        throw new Error("This team invite has already been answered.");
      if (invite.expiresAt <= new Date()) {
        await tx.serverTeamInvite.update({
          where: { id: invite.id },
          data: { status: "EXPIRED", respondedAt: new Date() },
        });
        throw new Error("This team invite has expired.");
      }
      const claimed = await tx.serverTeamInvite.updateMany({
        where: { id: invite.id, status: "PENDING" },
        data: { status: action === "ACCEPT" ? "ACCEPTED" : "DECLINED", respondedAt: new Date() },
      });
      if (claimed.count !== 1) throw new Error("This team invite has already been answered.");
      if (action === "ACCEPT") {
        await tx.serverTeamMember.upsert({
          where: { serverId_userId: { serverId: invite.serverId, userId: request.user!.id } },
          create: {
            serverId: invite.serverId,
            userId: request.user!.id,
            invitedById: invite.inviterId,
            role: invite.role,
          },
          update: { role: invite.role, invitedById: invite.inviterId, acceptedAt: new Date() },
        });
      }
      await createNotification(tx, {
        recipientId: invite.inviterId,
        category: "TEAM",
        title: `${request.user!.displayName} ${action === "ACCEPT" ? "accepted" : "declined"} your invitation`,
        body:
          action === "ACCEPT"
            ? `They can now access ${invite.server.name} with the assigned server-team permissions.`
            : `The invitation to manage ${invite.server.name} was declined.`,
        actionUrl: "/owner/settings",
        dedupeKey: `team-invite-response:${invite.id}`,
      });
      return tx.serverTeamInvite.findUniqueOrThrow({
        where: { id: invite.id },
        include: { server: { select: { id: true, name: true, hostname: true } } },
      });
    });
  });
  app.get("/v1/owner/servers/:serverId/team", { preHandler: app.authenticate }, async (request) => {
    const { serverId } = request.params as { serverId: string };
    const server = await requireOwnedServer(serverId, request.user!.id);
    const [members, invites] = await Promise.all([
      prisma.serverTeamMember.findMany({
        where: { serverId },
        include: {
          user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.serverTeamInvite.findMany({
        where: { serverId, status: "PENDING", expiresAt: { gt: new Date() } },
        include: {
          invitee: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);
    return {
      server: { id: server.id, name: server.name },
      owner: {
        id: request.user!.id,
        username: request.user!.username,
        displayName: request.user!.displayName,
        avatarUrl: request.user!.avatarUrl,
      },
      members,
      invites,
    };
  });
  app.patch(
    "/v1/owner/servers/:serverId/team/members/:memberId",
    { preHandler: app.authenticate },
    async (request) => {
      const { serverId, memberId } = request.params as { serverId: string; memberId: string };
      await requireOwnedServer(serverId, request.user!.id);
      const { role } = TeamMemberRoleInputSchema.parse(request.body);
      return prisma.serverTeamMember.update({ where: { id: memberId, serverId }, data: { role } });
    },
  );
  app.delete(
    "/v1/owner/servers/:serverId/team/members/:memberId",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const { serverId, memberId } = request.params as { serverId: string; memberId: string };
      await requireOwnedServer(serverId, request.user!.id);
      await prisma.serverTeamMember.delete({ where: { id: memberId, serverId } });
      return reply.code(204).send();
    },
  );
  app.delete(
    "/v1/owner/servers/:serverId/team/invites/:inviteId",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const { serverId, inviteId } = request.params as { serverId: string; inviteId: string };
      await requireOwnedServer(serverId, request.user!.id);
      await prisma.serverTeamInvite.update({
        where: { id: inviteId, serverId },
        data: { status: "REVOKED", respondedAt: new Date() },
      });
      return reply.code(204).send();
    },
  );
  app.get(
    "/v1/owner/campaigns",
    { preHandler: app.requirePermission("campaign:create") },
    async (request) =>
      prisma.campaign.findMany({
        where: { ownerId: request.user!.id },
        include: { server: true, milestones: true },
      }),
  );
  app.post(
    "/v1/owner/campaigns",
    { preHandler: app.requirePermission("campaign:create") },
    async (request, reply) => {
      const input = CampaignInputSchema.parse(request.body);
      return reply.code(201).send(await campaignService.create(request.user!.id, input));
    },
  );
  app.post(
    "/v1/owner/campaigns/:id/submit",
    { preHandler: app.requirePermission("campaign:create") },
    async (request) => {
      const { id } = request.params as { id: string };
      return campaignService.submit(request.user!.id, id);
    },
  );
  app.get(
    "/v1/owner/campaign-balance",
    { preHandler: app.requirePermission("campaign:create") },
    async (request) => {
      const entries = await prisma.campaignCreditLedgerEntry.findMany({
        where: { ownerId: request.user!.id },
        orderBy: { createdAt: "desc" },
      });
      const balance = calculateCampaignCreditBalance(entries);
      return {
        availableCredits: balance.total,
        purchasedCredits: balance.purchased,
        promotionalCredits: balance.promotional,
        entries: entries.map((entry) => ({
          id: entry.id,
          direction: entry.direction,
          credits: entry.amountCents,
          purchasedCredits: entry.purchasedCents,
          promotionalCredits: entry.promotionalCents,
          transactionType: entry.transactionType,
          referenceType: entry.referenceType,
          referenceId: entry.referenceId,
          expiresAt: entry.expiresAt,
          createdAt: entry.createdAt,
        })),
        promotionalTerms:
          "Promotional credits are non-refundable, non-transferable, and may expire.",
      };
    },
  );
  app.post(
    "/v1/owner/campaign-balance/checkout",
    { preHandler: app.requirePermission("campaign:create") },
    async (request, reply) => {
      if (env.NODE_ENV === "production") {
        return reply.code(503).send({
          code: "PAYMENTS_NOT_CONFIGURED",
          message:
            "Campaign balance checkout is unavailable until a production payment provider is configured.",
        });
      }
      const { amountCents } = request.body as { amountCents: number };
      if (!Number.isInteger(amountCents) || amountCents < 1000 || amountCents > 1_000_000) {
        return reply.code(400).send({
          code: "VALIDATION_ERROR",
          message: "Campaign balance purchases must be between $10 and $10,000.",
        });
      }
      return paymentProvider.createCheckoutSession({
        accountId: request.user!.id,
        amountCents,
        currency: "USD",
      });
    },
  );
  app.post("/v1/payments/webhooks/mock", async (request, reply) => {
    if (env.NODE_ENV === "production") {
      return reply.code(404).send({ code: "NOT_FOUND", message: "Endpoint not found." });
    }
    const signature = String(request.headers["x-payment-signature"] ?? "");
    const event = await paymentProvider.verifyWebhook(request.body, signature);
    const stored = await prisma.$transaction(async (tx) => {
      const existing = await tx.paymentEvent.findUnique({ where: { providerEventId: event.id } });
      if (existing) return existing;
      const created = await tx.paymentEvent.create({
        data: {
          providerEventId: event.id,
          type: event.type,
          referenceId: event.referenceId,
          amountCents: event.amountCents,
          currency: event.currency,
          payload: request.body as any,
          status: "PROCESSED",
          idempotencyKey: `payment-webhook:${event.id}`,
          processedAt: new Date(),
        },
      });
      if (event.type === "PAYMENT_SUCCEEDED") {
        await tx.campaignCreditLedgerEntry.create({
          data: {
            ownerId: event.referenceId,
            direction: "CREDIT",
            amountCents: event.amountCents,
            purchasedCents: event.amountCents,
            promotionalCents: 0,
            transactionType: "PURCHASED",
            referenceType: "PAYMENT_EVENT",
            referenceId: created.id,
            idempotencyKey: `payment-credit:${event.id}`,
          },
        });
      }
      return created;
    });
    return reply.code(202).send({ accepted: true, eventId: stored.id });
  });
  app.get(
    "/v1/owner/analytics",
    { preHandler: app.requirePermission("campaign:create") },
    async (request) => {
      const query = z
        .object({
          serverId: z.string().min(1),
          days: z.coerce.number().int().min(7).max(90).default(30),
        })
        .parse(request.query);
      await requireServerPermission(query.serverId, request.user!.id, "analytics");

      const since = new Date();
      since.setUTCDate(since.getUTCDate() - query.days + 1);
      since.setUTCHours(0, 0, 0, 0);

      const [events, campaigns] = await prisma.$transaction([
        prisma.analyticsEvent.findMany({
          where: { serverId: query.serverId, occurredAt: { gte: since } },
          select: { id: true, type: true, source: true, occurredAt: true, userId: true },
          orderBy: { occurredAt: "asc" },
        }),
        prisma.campaign.findMany({
          where: { serverId: query.serverId },
          select: {
            id: true,
            title: true,
            status: true,
            minimumSparksReward: true,
            maximumSparksReward: true,
            _count: { select: { participations: true } },
          },
          orderBy: { createdAt: "desc" },
        }),
      ]);

      const counts = new Map<string, number>();
      const days = new Map<string, Record<string, number>>();
      for (let offset = 0; offset < query.days; offset += 1) {
        const date = new Date(since);
        date.setUTCDate(since.getUTCDate() + offset);
        days.set(date.toISOString().slice(0, 10), {});
      }
      for (const event of events) {
        counts.set(event.type, (counts.get(event.type) ?? 0) + 1);
        const date = event.occurredAt.toISOString().slice(0, 10);
        const bucket = days.get(date);
        if (bucket) bucket[event.type] = (bucket[event.type] ?? 0) + 1;
      }

      const eventCount = (type: string) => counts.get(type) ?? 0;
      return {
        serverId: query.serverId,
        periodDays: query.days,
        totals: {
          events: events.length,
          impressions: eventCount("CAMPAIGN_IMPRESSION"),
          views: eventCount("CAMPAIGN_VIEW"),
          joins: eventCount("CAMPAIGN_JOIN"),
          connections: eventCount("SERVER_CONNECTION"),
          uniquePlayers: new Set(events.flatMap((event) => (event.userId ? [event.userId] : [])))
            .size,
          campaigns: campaigns.length,
          participations: campaigns.reduce(
            (total, campaign) => total + campaign._count.participations,
            0,
          ),
        },
        daily: [...days].map(([date, bucket]) => ({
          date,
          impressions: bucket.CAMPAIGN_IMPRESSION ?? 0,
          views: bucket.CAMPAIGN_VIEW ?? 0,
          joins: bucket.CAMPAIGN_JOIN ?? 0,
          connections: bucket.SERVER_CONNECTION ?? 0,
        })),
        campaigns,
        recentEvents: events
          .slice(-20)
          .reverse()
          .map(({ id, type, source, occurredAt }) => ({ id, type, source, occurredAt })),
        retention: {
          day1: null,
          day7: null,
          label: "Not enough verified return events in the seeded dataset.",
        },
      };
    },
  );

  app.get("/v1/admin/messages", { preHandler: app.requirePermission("message:send") }, async () =>
    notificationService.listAdminMessages(),
  );
  app.post(
    "/v1/admin/messages",
    {
      preHandler: app.requirePermission("message:send"),
      config: { rateLimit: { max: 30, timeWindow: "1 hour" } },
    },
    async (request, reply) => {
      const input = AdminMessageInputSchema.parse(request.body);
      const message = await notificationService.createAdminMessage(
        request.user!.id,
        input,
        request.id,
      );
      return reply.code(201).send(message);
    },
  );
  app.post(
    "/v1/admin/messages/:id/send",
    {
      preHandler: app.requirePermission("message:send"),
      config: { rateLimit: { max: 30, timeWindow: "1 hour" } },
    },
    async (request) => {
      const { id } = request.params as { id: string };
      return notificationService.sendDraft(request.user!.id, id, request.id);
    },
  );
  app.get(
    "/v1/admin/overview",
    { preHandler: app.requirePermission("campaign:review") },
    async () => {
      const [users, servers, campaigns, cases] = await prisma.$transaction([
        prisma.user.count(),
        prisma.server.count(),
        prisma.campaign.count(),
        prisma.moderationCase.count({ where: { status: "OPEN" } }),
      ]);
      return { users, servers, campaigns, openCases: cases };
    },
  );
  app.get(
    "/v1/admin/sparks",
    { preHandler: app.requirePermission("sparks:manage") },
    async (request) => {
      const query = z
        .object({
          search: z.string().trim().max(80).default(""),
          from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
          to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
          label: z.string().trim().max(80).default("Last 30 days"),
        })
        .refine((value) => Boolean(value.from) === Boolean(value.to), {
          message: "Both range dates are required.",
        })
        .superRefine((value, context) => {
          if (!value.from || !value.to) return;
          const from = new Date(`${value.from}T00:00:00.000Z`);
          const inclusiveTo = new Date(`${value.to}T00:00:00.000Z`);
          const duration = inclusiveTo.getTime() - from.getTime() + 86_400_000;
          if (
            !Number.isFinite(from.getTime()) ||
            !Number.isFinite(inclusiveTo.getTime()) ||
            duration < 86_400_000 ||
            duration > 366 * 86_400_000
          ) {
            context.addIssue({
              code: "custom",
              message: "Spark economy ranges must cover between 1 and 366 UTC days.",
            });
          }
        })
        .parse(request.query);
      const today = utcDayStart();
      const from = query.from
        ? new Date(`${query.from}T00:00:00.000Z`)
        : new Date(today.getTime() - 29 * 86_400_000);
      const inclusiveTo = query.to ? new Date(`${query.to}T00:00:00.000Z`) : today;
      const to = new Date(inclusiveTo.getTime() + 86_400_000);
      return adminSparkEconomyService.dashboard(
        { from, to, label: query.label },
        query.search,
      );
    },
  );
  app.post(
    "/v1/admin/sparks/adjustments",
    {
      preHandler: app.requirePermission("sparks:manage"),
      config: { rateLimit: { max: 30, timeWindow: "1 hour" } },
    },
    async (request, reply) => {
      const input = AdminSparksAdjustmentInputSchema.parse(request.body);
      return reply
        .code(201)
        .send(await adminSparksService.adjust(request.user!.id, input, request.id));
    },
  );
  app.get(
    "/v1/admin/sponsored-stores",
    { preHandler: app.requirePermission("sponsored_shop:manage") },
    () => sponsoredShopService.adminCatalog(),
  );

  app.get(
    "/v1/admin/server-store-payouts",
    { preHandler: app.requirePermission("ledger:view_internal") },
    () => serverStoreService.adminPayoutRequests(),
  );

  app.put(
    "/v1/admin/server-store-payout-profile",
    { preHandler: app.requirePermission("ledger:view_internal") },
    async (request) => {
      const input = AdminServerStorePayoutProfileInputSchema.parse(request.body);
      return serverStoreService.upsertPayoutProfile(
        request.user!.id,
        input,
        request.id,
      );
    },
  );

  app.post(
    "/v1/admin/server-store-payouts/:payoutId/actions",
    { preHandler: app.requirePermission("ledger:view_internal") },
    async (request) => {
      const { payoutId } = request.params as { payoutId: string };
      const input = AdminServerStorePayoutActionSchema.parse(request.body);
      return serverStoreService.actOnPayout(
        request.user!.id,
        payoutId,
        input,
        request.id,
      );
    },
  );
  app.post(
    "/v1/admin/sponsored-stores",
    {
      preHandler: app.requirePermission("sponsored_shop:manage"),
      config: { rateLimit: { max: 30, timeWindow: "1 hour" } },
    },
    async (request, reply) => {
      const input = AdminSponsoredStoreInputSchema.parse(request.body);
      return reply
        .code(201)
        .send(await sponsoredShopService.createStore(request.user!.id, input, request.id));
    },
  );
  app.patch(
    "/v1/admin/sponsored-stores/:storeId",
    { preHandler: app.requirePermission("sponsored_shop:manage") },
    async (request) => {
      const { storeId } = request.params as { storeId: string };
      const input = AdminSponsoredStoreUpdateSchema.parse(request.body);
      return sponsoredShopService.updateStore(request.user!.id, storeId, input, request.id);
    },
  );
  app.post(
    "/v1/admin/sponsored-stores/:storeId/items",
    {
      preHandler: app.requirePermission("sponsored_shop:manage"),
      config: { rateLimit: { max: 60, timeWindow: "1 hour" } },
    },
    async (request, reply) => {
      const { storeId } = request.params as { storeId: string };
      const input = AdminSponsoredItemInputSchema.parse(request.body);
      return reply
        .code(201)
        .send(await sponsoredShopService.createItem(request.user!.id, storeId, input, request.id));
    },
  );
  app.patch(
    "/v1/admin/sponsored-items/:itemId",
    { preHandler: app.requirePermission("sponsored_shop:manage") },
    async (request) => {
      const { itemId } = request.params as { itemId: string };
      const input = AdminSponsoredItemUpdateSchema.parse(request.body);
      return sponsoredShopService.updateItem(request.user!.id, itemId, input, request.id);
    },
  );
  app.get(
    "/v1/admin/sponsored-purchases",
    { preHandler: app.requirePermission("sponsored_purchase:fulfill") },
    async (request) => {
      const query = z
        .object({
          status: z
            .enum(["REQUESTED", "PROCESSING", "DELIVERED", "CANCELLED", "REFUNDED"])
            .optional(),
        })
        .parse(request.query);
      return sponsoredShopService.adminPurchases(query.status);
    },
  );
  app.post(
    "/v1/admin/sponsored-purchases/:purchaseId/actions",
    {
      preHandler: app.requirePermission("sponsored_purchase:fulfill"),
      config: { rateLimit: { max: 60, timeWindow: "1 hour" } },
    },
    async (request) => {
      const { purchaseId } = request.params as { purchaseId: string };
      const input = AdminSponsoredPurchaseActionSchema.parse(request.body);
      return sponsoredShopService.actOnPurchase(
        request.user!.id,
        purchaseId,
        input,
        request.id,
      );
    },
  );
  app.get(
    "/v1/admin/users/:userId",
    { preHandler: app.requirePermission("user:suspend") },
    async (request, reply) => {
      const { userId } = request.params as { userId: string };
      const report = await adminEntityService.userReport(userId);
      return (
        report ??
        reply.code(404).send({ code: "NOT_FOUND", message: "User account not found." })
      );
    },
  );
  app.post(
    "/v1/admin/users/:userId/status",
    {
      preHandler: app.requirePermission("user:suspend"),
      config: { rateLimit: { max: 30, timeWindow: "1 hour" } },
    },
    async (request) => {
      const { userId } = request.params as { userId: string };
      const input = AdminUserStatusActionSchema.parse(request.body);
      return adminEntityService.updateUserStatus(
        request.user!.id,
        userId,
        input,
        request.id,
      );
    },
  );
  app.get(
    "/v1/admin/servers/:serverId",
    { preHandler: app.requirePermission("server:moderate") },
    async (request, reply) => {
      const { serverId } = request.params as { serverId: string };
      const report = await adminEntityService.serverReport(serverId);
      return report ?? reply.code(404).send({ code: "NOT_FOUND", message: "Server not found." });
    },
  );
  app.post(
    "/v1/admin/servers/:serverId/status",
    {
      preHandler: app.requirePermission("server:moderate"),
      config: { rateLimit: { max: 30, timeWindow: "1 hour" } },
    },
    async (request) => {
      const { serverId } = request.params as { serverId: string };
      const input = AdminServerStatusActionSchema.parse(request.body);
      return adminEntityService.updateServerStatus(
        request.user!.id,
        serverId,
        input,
        request.id,
      );
    },
  );
  app.get(
    "/v1/admin/entities",
    { preHandler: app.requirePermission("campaign:review") },
    async (request) => {
      const { type } = z.object({ type: z.enum(["users", "servers"]) }).parse(request.query);
      if (type === "users") {
        return prisma.user.findMany({
          select: {
            id: true,
            username: true,
            displayName: true,
            status: true,
            roles: true,
            lastActiveAt: true,
          },
          orderBy: { lastActiveAt: "desc" },
          take: 100,
        });
      }
      return prisma.server.findMany({
        select: {
          id: true,
          name: true,
          moderationStatus: true,
          verificationStatus: true,
          updatedAt: true,
          owner: { select: { username: true, displayName: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: 100,
      });
    },
  );
  app.get(
    "/v1/admin/campaigns",
    { preHandler: app.requirePermission("campaign:review") },
    async () =>
      prisma.campaign.findMany({
        where: { status: { in: ["SUBMITTED", "UNDER_REVIEW", "CHANGES_REQUESTED"] } },
        include: {
          server: {
            select: {
              id: true,
              name: true,
              slug: true,
              verificationStatus: true,
              moderationStatus: true,
            },
          },
          owner: {
            select: { id: true, username: true, displayName: true, email: true, status: true },
          },
          milestones: true,
        },
        orderBy: { createdAt: "asc" },
      }),
  );
  app.get(
    "/v1/admin/campaign-servers",
    { preHandler: app.requirePermission("campaign:admin_create") },
    async () =>
      prisma.server.findMany({
        where: {
          publicListing: true,
          moderationStatus: "APPROVED",
          verificationStatus: "VERIFIED",
          claimed: true,
          edition: "JAVA",
        },
        select: {
          id: true,
          name: true,
          slug: true,
          hostname: true,
          port: true,
          edition: true,
          versions: true,
          categories: true,
          online: true,
          playerCount: true,
          owner: { select: { username: true, displayName: true } },
        },
        orderBy: [{ online: "desc" }, { name: "asc" }],
        take: 200,
      }),
  );
  app.get(
    "/v1/admin/campaigns/ongoing",
    { preHandler: app.requirePermission("campaign:terminate") },
    async () => {
      const campaigns = await prisma.campaign.findMany({
        where: { status: { in: ["APPROVED", "SCHEDULED", "ACTIVE", "PAUSED"] } },
        select: {
          id: true,
          title: true,
          status: true,
          startsAt: true,
          endsAt: true,
          fundingSource: true,
          campaignBudgetCredits: true,
          consumedBudgetCredits: true,
          creditCostPerParticipant: true,
          minimumSparksReward: true,
          maximumSparksReward: true,
          _count: { select: { participations: true } },
          server: {
            select: {
              id: true,
              name: true,
              slug: true,
              owner: { select: { username: true, displayName: true } },
            },
          },
        },
        orderBy: [{ status: "asc" }, { endsAt: "asc" }],
        take: 200,
      });
      return campaigns.map(({ creditCostPerParticipant, ...campaign }) => ({
        ...campaign,
        consumedBudgetCredits: Math.max(
          campaign.consumedBudgetCredits,
          Math.min(
            campaign.campaignBudgetCredits,
            campaign._count.participations * creditCostPerParticipant,
          ),
        ),
      }));
    },
  );
  app.post(
    "/v1/admin/campaigns/sponsored",
    {
      preHandler: app.requirePermission("campaign:admin_create"),
      config: { rateLimit: { max: 20, timeWindow: "1 hour" } },
    },
    async (request, reply) => {
      const input = AdminSponsoredCampaignInputSchema.parse(request.body);
      return reply
        .code(201)
        .send(await campaignService.createSponsored(request.user!.id, input, request.id));
    },
  );
  app.post(
    "/v1/admin/campaigns/:id/terminate",
    {
      preHandler: app.requirePermission("campaign:terminate"),
      config: { rateLimit: { max: 30, timeWindow: "1 hour" } },
    },
    async (request) => {
      const { id } = request.params as { id: string };
      const input = AdminCampaignTerminationInputSchema.parse(request.body);
      return campaignService.terminate(request.user!.id, id, input, request.id);
    },
  );
  app.post(
    "/v1/admin/campaigns/:id/review",
    { preHandler: app.requirePermission("campaign:review") },
    async (request) => {
      const { id } = request.params as { id: string };
      const body = campaignReviewSchema.parse(request.body);
      const status = {
        APPROVE: "APPROVED",
        REQUEST_CHANGES: "CHANGES_REQUESTED",
        REJECT: "REJECTED",
        PAUSE: "PAUSED",
        ARCHIVE: "ARCHIVED",
      }[body.action] as any;
      return prisma.$transaction(async (tx) => {
        const before = await tx.campaign.findUniqueOrThrow({ where: { id } });
        const updated = await tx.campaign.update({
          where: { id },
          data: {
            status,
            moderationNotes: body.note,
            publishedAt: body.action === "APPROVE" ? new Date() : undefined,
          },
        });
        await tx.auditLog.create({
          data: {
            actorId: request.user!.id,
            action: `CAMPAIGN_${body.action}`,
            entityType: "CAMPAIGN",
            entityId: id,
            beforeSnapshot: { status: before.status },
            afterSnapshot: { status },
            reason: body.note,
          },
        });
        return updated;
      });
    },
  );
  app.get(
    "/v1/admin/payment-events",
    { preHandler: app.requirePermission("ledger:view_internal") },
    async () => prisma.paymentEvent.findMany({ orderBy: { createdAt: "desc" }, take: 200 }),
  );
  app.get(
    "/v1/admin/ledger",
    { preHandler: app.requirePermission("ledger:view_internal") },
    async () => ({
      sparks: await prisma.sparksLedgerEntry.findMany({
        include: {
          user: { select: { id: true, username: true, displayName: true, status: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      campaignCredits: await prisma.campaignCreditLedgerEntry.findMany({
        include: {
          owner: { select: { id: true, username: true, displayName: true, status: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    }),
  );
  app.get(
    "/v1/admin/audit-logs",
    { preHandler: app.requirePermission("ledger:view_internal") },
    async () =>
      prisma.auditLog.findMany({
        include: {
          actor: { select: { id: true, username: true, displayName: true, roles: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
  );
  app.post(
    "/v1/admin/completions/:id/review",
    { preHandler: app.requirePermission("reward:approve") },
    async (request) => {
      const { id } = request.params as { id: string };
      const { approved, reason } = completionReviewSchema.parse(request.body);
      const completion = await campaignService.reviewCompletion(
        request.user!.id,
        id,
        approved,
        reason,
      );
      if (approved) {
        const owner = await prisma.milestoneCompletion.findUnique({
          where: { id: completion.id },
          select: { participation: { select: { playerId: true } } },
        });
        if (owner) await questService.evaluateAndAward(owner.participation.playerId);
      }
      return completion;
    },
  );

  app.post(
    "/v1/integrations/server/events",
    { config: { rateLimit: { max: 200, timeWindow: "1 minute" } } },
    (_request, reply) =>
      reply.code(410).send({
        code: "ENDPOINT_RETIRED",
        message: "Use a server-scoped signed plugin key with /v1/plugin/events.",
      }),
  );
  app.post(
    "/v1/integrations/client/events",
    { config: { rateLimit: { max: 100, timeWindow: "1 minute" } } },
    (_request, reply) =>
      reply.code(410).send({
        code: "ENDPOINT_RETIRED",
        message: "Client-submitted integration events are not authoritative.",
      }),
  );
  app.get(
    "/v1/integrations/campaigns/:campaignId/config",
    { preHandler: app.authenticate },
    async (request) => {
      const { campaignId } = request.params as { campaignId: string };
      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        select: { serverId: true },
      });
      if (!campaign) throw new Error("Campaign not found.");
      await requireServerPermission(campaign.serverId, request.user!.id, "campaigns");
      return prisma.campaign.findUnique({
        where: { id: campaignId },
        select: {
          id: true,
          serverId: true,
          milestones: {
            select: {
              id: true,
              templateType: true,
              verificationMethod: true,
              verificationConfig: true,
            },
          },
        },
      });
    },
  );
};
