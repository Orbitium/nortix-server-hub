import { createHash, randomBytes } from "node:crypto";
import { prisma, type Prisma } from "@nortix/database";
import {
  CampaignInputSchema,
  JoinCampaignSchema,
  MilestoneSubmissionSchema,
  ServerInputSchema,
  ServerTeamInviteInputSchema,
  TeamInviteResponseSchema,
  TeamMemberRoleInputSchema,
  WithdrawalInputSchema,
  CrackedAccountClaimSchema,
} from "@nortix/shared";
import {
  CreateServerVerificationSchema,
  PluginCapabilitiesHandshakeSchema,
  PluginVerificationHandshakeSchema,
  PluginVerificationStatusSchema,
  ServerPluginEventSchema,
  PluginPlayerHistorySchema,
} from "@nortix/plugin-sdk";
import { MockPaymentProvider, MockPayoutProvider } from "@nortix/integrations";
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
import { CampaignService } from "./campaigns/service.js";
import { WithdrawalService } from "./withdrawals/service.js";
import { ServerVerificationService } from "./server-verification/service.js";
import { MinecraftIdentityService } from "./minecraft-identities/service.js";

const campaignService = new CampaignService();
const withdrawalService = new WithdrawalService();
const serverVerificationService = new ServerVerificationService();
const minecraftIdentityService = new MinecraftIdentityService();

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

const hashPluginToken = (token: string) => createHash("sha256").update(token).digest("hex");

const authenticateServerPlugin = async (authorization: string | undefined, serverId: string) => {
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (!token.startsWith("npx_")) throw new Error("A valid server plugin token is required.");
  const credential = await prisma.integrationApiKey.findFirst({
    where: { serverId, keyHash: hashPluginToken(token), revokedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
    include: { server: true },
  });
  if (!credential || !credential.scopes.includes("plugin:events")) throw new Error("The server plugin token is invalid or revoked.");
  if (!credential.server.claimed || credential.server.verificationStatus !== "VERIFIED") {
    throw new Error("Server verification is required before accepting plugin evidence.");
  }
  await prisma.integrationApiKey.update({ where: { id: credential.id }, data: { lastUsedAt: new Date() } });
  return credential;
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

const profileInputSchema = z.object({
  displayName: z.string().trim().min(1).max(80).optional(),
  avatarUrl: z.string().url().max(2_000).nullable().optional(),
  publicProfile: z.record(z.string(), z.unknown()).refine(
    (value) => JSON.stringify(value).length <= 8_000,
    "Public profile is too large.",
  ).optional(),
}).strict();

const campaignReviewSchema = z.object({
  action: z.enum(["APPROVE", "REQUEST_CHANGES", "REJECT", "PAUSE", "ARCHIVE"]),
  note: z.string().trim().max(2_000).optional(),
}).strict();

const withdrawalTransitionSchema = z.object({
  status: z.enum(["UNDER_REVIEW", "APPROVED", "PROCESSING", "PAID", "FAILED", "CANCELLED"]),
  reason: z.string().trim().max(2_000).optional(),
}).strict();

const completionReviewSchema = z.object({
  approved: z.boolean(),
  reason: z.string().trim().max(2_000).optional(),
}).strict();

const sparksPurchaseSchema = z.object({
  itemId: z.string().min(1).max(120),
}).strict();

const premiumIdentityCompletionSchema = z.object({
  code: z.string().regex(/^NX-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}$/),
  uuid: z.string().uuid(),
  username: z.string().regex(/^[A-Za-z0-9_]{3,16}$/),
}).strict();

const parsePagination = (query: Record<string, unknown>) => ({
  page: Math.max(1, Number(query.page) || 1),
  pageSize: Math.min(50, Math.max(1, Number(query.pageSize) || 12)),
});

export const registerRoutes = async (app: FastifyInstance, env: Env) => {
  const paymentProvider = new MockPaymentProvider(env.PAYMENT_WEBHOOK_SECRET);
  const payoutProvider = new MockPayoutProvider();
  const identityCleanupTimer = setInterval(
    () => minecraftIdentityService.cleanup().catch((error) => app.log.error(
      { err: error },
      "minecraft identity cleanup failed",
    )),
    5 * 60_000,
  );
  identityCleanupTimer.unref();
  app.addHook("onClose", async () => clearInterval(identityCleanupTimer));
  app.get("/health", async () => ({ status: "ok", service: "nortix-api" }));

  app.get("/v1/auth/me", { preHandler: app.authenticate }, async (request) =>
    prisma.user.findUnique({ where: { id: request.user!.id }, select: selfUserSelect }),
  );
  app.get("/v1/users/me", { preHandler: app.authenticate }, async (request) =>
    prisma.user.findUnique({ where: { id: request.user!.id }, select: selfUserSelect }),
  );
  app.patch("/v1/users/me/profile", { preHandler: app.authenticate }, async (request) => {
    const input = profileInputSchema.parse(request.body);
    return prisma.user.update({
      where: { id: request.user!.id },
      data: {
        displayName: input.displayName,
        avatarUrl: input.avatarUrl,
        publicProfile: input.publicProfile as Prisma.InputJsonValue | undefined,
      },
      select: selfUserSelect,
    });
  });
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
      return reply.code(201).send(
        await minecraftIdentityService.reserveCracked(
          request.user!.id,
          input.serverId,
          input.minecraftUsername,
        ),
      );
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
      if (!verifyPremiumIdentityProof(
        env.IDENTITY_VERIFICATION_SECRET,
        input,
        { timestamp, nonce, signature },
      )) {
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
      },
    });
    return user ?? reply.code(404).send({ code: "NOT_FOUND", message: "Profile not found." });
  });

  app.get("/v1/servers", async (request) => {
    const query = request.query as Record<string, unknown>;
    const { page, pageSize } = parsePagination(query);
    const search = String(query.search ?? "");
    const where = {
      publicListing: true,
      moderationStatus: "APPROVED" as const,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { description: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };
    const [items, total] = await prisma.$transaction([
      prisma.server.findMany({
        where,
        select: {
          ...publicServerSelect,
          playerHistorySyncedAt: true,
          _count: { select: { campaigns: true, reviews: true } },
          reviews: { select: { rating: true } },
        },
        orderBy: [{ online: "desc" }, { playerCount: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.server.count({ where }),
    ]);
    return {
      items: items.map(({ playerHistorySyncedAt, ...server }) => ({
        ...server,
        crackedAccountLinkingAvailable: Boolean(playerHistorySyncedAt),
      })),
      page,
      pageSize,
      total,
    };
  });
  app.get("/v1/servers/:slug", async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const server = await prisma.server.findFirst({
      where: { slug, publicListing: true, moderationStatus: "APPROVED" },
      select: {
        ...publicServerSelect,
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
    return server ?? reply.code(404).send({ code: "NOT_FOUND", message: "Server not found." });
  });
  app.post(
    "/v1/servers",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const input = ServerInputSchema.parse(request.body);
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
      const roles = Array.from(new Set([...request.user!.roles, "SERVER_OWNER" as const]));
      const server = await prisma.$transaction(async (tx) => {
        await tx.user.update({ where: { id: request.user!.id }, data: { roles } });
        const created = await tx.server.create({
          data: {
            ownerId: request.user!.id,
            name: input.name,
            slug,
            description: input.description,
            hostname: input.hostname,
            port: input.port,
            edition: input.edition,
            versions: input.versions,
            categories: input.categories,
            tags: input.tags,
            verificationParentId: verificationParent?.id,
            verificationScope: verificationParent ? "PROXY_CHILD" : "SERVER",
            verificationStatus: verificationParent ? "VERIFIED" : "UNVERIFIED",
            claimed: Boolean(verificationParent),
            websiteUrl: input.websiteUrl,
            discordUrl: input.discordUrl,
            screenshotUrls: [],
          },
        });
        if (verificationParent) {
          await tx.serverVerification.create({
            data: {
              serverId: created.id,
              provider: "PROXY_INHERITED",
              status: "VERIFIED",
              challenge: {
                parentProxyId: verificationParent.id,
                networkScope: "PROXY_CHILD",
              },
              evidence: {
                inheritedAt: new Date().toISOString(),
                parentProxyId: verificationParent.id,
              },
            },
          });
        }
        return created;
      });
      return reply.code(201).send(server);
    },
  );
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
  app.get(
    "/v1/servers/:id/verification",
    { preHandler: app.authenticate },
    async (request) => {
      const { id } = request.params as { id: string };
      return serverVerificationService.getOwned(id, request.user!.id);
    },
  );
  app.post(
    "/v1/servers/:id/verification/check",
    { preHandler: app.authenticate },
    async (request) => {
      const { id } = request.params as { id: string };
      return serverVerificationService.verify(id, request.user!.id);
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

  app.post("/v1/owner/servers/:id/plugin-token", { preHandler: app.authenticate }, async (request) => {
    const { id } = request.params as { id: string };
    const server = await requireOwnedServer(id, request.user!.id);
    if (!server.claimed || server.verificationStatus !== "VERIFIED") {
      throw new Error("Server verification is required before connecting milestone tracking.");
    }
    const token = `npx_${randomBytes(32).toString("base64url")}`;
    await prisma.$transaction([
      prisma.integrationApiKey.updateMany({ where: { serverId: id, name: "Nortix Paper milestone plugin", revokedAt: null }, data: { revokedAt: new Date() } }),
      prisma.integrationApiKey.create({
        data: { serverId: id, name: "Nortix Paper milestone plugin", keyHash: hashPluginToken(token), scopes: ["plugin:events", "plugin:capabilities"], lastFour: token.slice(-4) },
      }),
    ]);
    return { serverId: id, serverName: server.name, token, shownOnce: true };
  });

  app.get("/v1/owner/servers/:id/plugin-capabilities", { preHandler: app.authenticate }, async (request) => {
    const { id } = request.params as { id: string };
    await requireServerPermission(id, request.user!.id, "integrations");
    return prisma.server.findUniqueOrThrow({
      where: { id },
      select: { id: true, name: true, verificationParentId: true, pluginCapabilities: true, pluginLastSeenAt: true, pluginInstanceId: true },
    });
  });

  app.post("/v1/plugin/capabilities", async (request) => {
    const input = PluginCapabilitiesHandshakeSchema.parse(request.body);
    const credential = await authenticateServerPlugin(request.headers.authorization, input.serverId);
    if (!credential.scopes.includes("plugin:capabilities")) {
      throw new Error("The plugin token does not allow capability registration.");
    }
    const server = await prisma.server.update({
      where: { id: input.serverId },
      data: { pluginCapabilities: input.capabilities, pluginLastSeenAt: new Date(), pluginInstanceId: input.instanceId },
      select: { id: true, name: true, verificationParentId: true },
    });
    return { accepted: true, serverId: server.id, networkId: server.verificationParentId ?? server.id, capabilities: input.capabilities.length };
  });

  app.post(
    "/v1/plugin/player-history",
    { config: { rateLimit: { max: 120, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const input = PluginPlayerHistorySchema.parse(request.body);
      const credential = await authenticateServerPlugin(request.headers.authorization, input.serverId);
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

  app.post("/v1/plugin/events", { config: { rateLimit: { max: 600, timeWindow: "1 minute" } } }, async (request, reply) => {
    const input = ServerPluginEventSchema.parse(request.body);
    const credential = await authenticateServerPlugin(request.headers.authorization, input.serverId);
    const capabilities = Array.isArray(credential.server.pluginCapabilities)
      ? credential.server.pluginCapabilities
      : [];
    const advertisedMetrics = capabilities.flatMap((capability) => {
      if (!capability || typeof capability !== "object" || !("metrics" in capability)) return [];
      const metrics = (capability as { metrics?: unknown }).metrics;
      return Array.isArray(metrics) ? metrics.filter((metric): metric is string => typeof metric === "string") : [];
    });
    const validated = validatePluginEvent(input, {
      boundInstanceId: credential.server.pluginInstanceId,
      advertisedMetrics,
    });
    const existing = await prisma.analyticsEvent.findUnique({
      where: { id: input.id },
      select: { id: true, serverId: true },
    });
    if (existing) {
      if (existing.serverId !== input.serverId) throw new Error("Plugin event identifier is already in use.");
      return reply.code(202).send({ accepted: true, eventId: existing.id, duplicate: true });
    }
    const server = credential.server;
    const stored = await prisma.analyticsEvent.create({
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
    });

    const activatedLink = input.type === "PLAYER_JOIN"
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
    if (!identity && !crackedLink) {
      return reply.code(202).send({ accepted: true, eventId: stored.id, matchedParticipations: 0 });
    }
    const serverIds = [server.id];
    if (server.verificationParentId) serverIds.push(server.verificationParentId);
    else {
      const children = await prisma.server.findMany({ where: { verificationParentId: server.id }, select: { id: true } });
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
        const config = { ...(milestone.verificationConfig as Record<string, unknown>), ...(milestone.completionRequirements as Record<string, unknown>) };
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
          if (metric === "PLAYER_KILLS" || metric === "UNIQUE_PLAYER_KILLS" || metric === "PVP_STREAK") return item.type === "PLAYER_KILL";
          if (metric === "MOB_KILLS") return item.type === "MOB_KILL" && (!config.entityType || data.entityType === config.entityType);
          if (metric === "BLOCKS_BROKEN") return item.type === "BLOCK_BREAK" && (!config.material || data.material === config.material);
          if (metric === "PLAYTIME_SECONDS") return item.type === "PLAYTIME";
          return item.type === "METRIC_SNAPSHOT" && data.metric === metric;
        });
        let value = relevant.length;
        if (metric === "UNIQUE_PLAYER_KILLS") value = new Set(relevant.map((item) => String((item.metadata as Record<string, unknown>).victimUuid ?? ""))).size;
        else if (metric === "PLAYTIME_SECONDS") value = relevant.reduce((total, item) => total + Number((item.metadata as Record<string, unknown>).seconds ?? 0), 0);
        else if (["SKYBLOCK_LEVEL", "ISLAND_WORTH", "LIFESTEAL_HEARTS", "SKILL_LEVEL"].includes(metric)) value = Number((relevant[0]?.metadata as Record<string, unknown> | undefined)?.value ?? 0);
        else if (metric === "PVP_STREAK") {
          value = 0;
          for (const item of relevant) value = Math.max(value, Number((item.metadata as Record<string, unknown>).streak ?? 0));
        }
        if (value >= target) {
          await prisma.milestoneCompletion.upsert({
            where: { participationId_milestoneId: { participationId: participation.id, milestoneId: milestone.id } },
            update: { evidence: { metric, target, observed: value, serverIds: scopedIds, backendCalculated: true, attestation: "UNTRUSTED_SERVER_PLUGIN" }, verificationSource: "SERVER_PLUGIN" },
            create: { participationId: participation.id, milestoneId: milestone.id, evidence: { metric, target, observed: value, serverIds: scopedIds, backendCalculated: true, attestation: "UNTRUSTED_SERVER_PLUGIN" }, verificationSource: "SERVER_PLUGIN", status: "PENDING" },
          });
          completed++;
        }
      }
      await prisma.campaignParticipation.update({ where: { id: participation.id }, data: { status: "ACTIVE", lastActivityAt: new Date() } });
    }
    await prisma.server.update({ where: { id: input.serverId }, data: { pluginLastSeenAt: new Date(), pluginInstanceId: input.instanceId } });
    return reply.code(202).send({ accepted: true, eventId: stored.id, matchedParticipations: participations.length, milestonesReached: completed });
  });

  app.get("/v1/campaigns", async (request) => {
    const { page, pageSize } = parsePagination(request.query as Record<string, unknown>);
    const where = {
      status: "ACTIVE" as const,
      startsAt: { lte: new Date() },
      endsAt: { gt: new Date() },
      server: { publicListing: true, moderationStatus: "APPROVED" as const },
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
        server: { publicListing: true, moderationStatus: "APPROVED" },
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
      return reply.code(201).send(completion);
    },
  );

  app.get("/v1/earnings/summary", { preHandler: app.authenticate }, async (request) => {
    const entries = await prisma.earningsLedgerEntry.findMany({
      where: { userId: request.user!.id, currency: "USD" },
    });
    const availableCents = entries.reduce(
      (balance, entry) =>
        balance + (entry.direction === "CREDIT" ? entry.amountCents : -entry.amountCents),
      0,
    );
    return {
      availableCents,
      pendingCents: request.user!.pendingEarningsCache,
      currency: "USD",
      minimumWithdrawalCents: env.MIN_WITHDRAWAL_USD * 100,
    };
  });
  app.get("/v1/earnings/transactions", { preHandler: app.authenticate }, async (request) =>
    prisma.earningsLedgerEntry.findMany({
      where: { userId: request.user!.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  );
  app.get("/v1/withdrawals", { preHandler: app.authenticate }, async (request) =>
    prisma.withdrawalRequest.findMany({
      where: { playerId: request.user!.id },
      orderBy: { createdAt: "desc" },
    }),
  );
  app.post(
    "/v1/withdrawals",
    { preHandler: app.requirePermission("withdrawal:request") },
    async (request, reply) => {
      const input = WithdrawalInputSchema.parse(request.body);
      const withdrawal = await withdrawalService.request(request.user!.id, input);
      return reply.code(201).send(withdrawal);
    },
  );

  app.get("/v1/sparks/summary", { preHandler: app.authenticate }, async (request) => {
    const entries = await prisma.sparksLedgerEntry.findMany({
      where: { userId: request.user!.id },
    });
    const balance = entries.reduce(
      (total, entry) => total + (entry.direction === "CREDIT" ? entry.amount : -entry.amount),
      0,
    );
    return { balance, cashValue: null, withdrawable: false };
  });
  app.get("/v1/sparks/transactions", { preHandler: app.authenticate }, async (request) =>
    prisma.sparksLedgerEntry.findMany({
      where: { userId: request.user!.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  );
  app.get("/v1/sparks/shop", async () =>
    prisma.cosmeticItem.findMany({ where: { available: true }, orderBy: { sparksPrice: "asc" } }),
  );
  app.post("/v1/sparks/purchases", { preHandler: app.authenticate }, async (request, reply) => {
    const { itemId } = sparksPurchaseSchema.parse(request.body);
    const purchase = await prisma.$transaction(async (tx) => {
      const [item, entries] = await Promise.all([
        tx.cosmeticItem.findUnique({ where: { id: itemId } }),
        tx.sparksLedgerEntry.findMany({ where: { userId: request.user!.id } }),
      ]);
      if (!item?.available) throw new Error("Cosmetic is not available.");
      const balance = entries.reduce(
        (sum, entry) => sum + (entry.direction === "CREDIT" ? entry.amount : -entry.amount),
        0,
      );
      if (balance < item.sparksPrice) throw new Error("Not enough Sparks.");
      const ledger = await tx.sparksLedgerEntry.create({
        data: {
          userId: request.user!.id,
          direction: "DEBIT",
          amount: item.sparksPrice,
          transactionType: "COSMETIC_PURCHASE",
          referenceType: "COSMETIC_ITEM",
          referenceId: item.id,
          idempotencyKey: `cosmetic:${request.user!.id}:${item.id}`,
        },
      });
      return tx.cosmeticPurchase.create({
        data: { userId: request.user!.id, itemId: item.id, sparksLedgerEntryId: ledger.id },
      });
    }, { isolationLevel: "Serializable" });
    return reply.code(201).send(purchase);
  });

  app.get(
    "/v1/owner/servers",
    { preHandler: app.authenticate },
    async (request) => {
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
          playerCount: true,
          maxPlayers: true,
          pluginLastSeenAt: true,
          createdAt: true,
          updatedAt: true,
          owner: { select: { id: true, username: true, displayName: true } },
          teamMembers: { where: { userId }, select: { role: true } },
        },
        orderBy: { updatedAt: "desc" },
      });
      return servers.map(({ teamMembers, ...server }) => {
        const membership = teamMembers[0];
        return {
          ...server,
          access: server.ownerId === userId
            ? { type: "OWNER", role: "OWNER", permissions: ["analytics", "campaigns", "integrations", "settings", "team"] }
            : { type: "TEAM", role: membership!.role, permissions: teamPermissions[membership!.role] },
        };
      });
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
        server: { select: { id: true, name: true, hostname: true, owner: { select: { username: true, displayName: true } } } },
        inviter: { select: { username: true, displayName: true, avatarUrl: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  });
  app.post("/v1/owner/servers/:serverId/team/invites", { preHandler: app.authenticate }, async (request, reply) => {
    const { serverId } = request.params as { serverId: string };
    const input = ServerTeamInviteInputSchema.parse(request.body);
    const server = await requireOwnedServer(serverId, request.user!.id);
    const invitee = await prisma.user.findFirst({
      where: { username: { equals: input.username, mode: "insensitive" } },
      select: { id: true, username: true, displayName: true, avatarUrl: true },
    });
    if (!invitee) return reply.code(404).send({ code: "NOT_FOUND", message: "No Nortix account has that username." });
    if (invitee.id === request.user!.id) throw new Error("The server owner already has full access.");
    const member = await prisma.serverTeamMember.findUnique({ where: { serverId_userId: { serverId, userId: invitee.id } } });
    if (member) throw new Error("That user is already a team member.");
    const pending = await prisma.serverTeamInvite.findFirst({
      where: { serverId, inviteeId: invitee.id, status: "PENDING", expiresAt: { gt: new Date() } },
    });
    if (pending) throw new Error("That user already has a pending invite for this server.");
    const invite = await prisma.serverTeamInvite.create({
      data: { serverId, inviterId: request.user!.id, inviteeId: invitee.id, role: input.role, expiresAt: new Date(Date.now() + 604_800_000) },
      include: { invitee: { select: { username: true, displayName: true, avatarUrl: true } } },
    });
    return reply.code(201).send({ ...invite, server: { id: server.id, name: server.name } });
  });
  app.patch("/v1/team/invites/:inviteId", { preHandler: app.authenticate }, async (request) => {
    const { inviteId } = request.params as { inviteId: string };
    const { action } = TeamInviteResponseSchema.parse(request.body);
    return prisma.$transaction(async (tx) => {
      const invite = await tx.serverTeamInvite.findFirst({ where: { id: inviteId, inviteeId: request.user!.id } });
      if (!invite) throw new Error("Team invite not found.");
      if (invite.status !== "PENDING") throw new Error("This team invite has already been answered.");
      if (invite.expiresAt <= new Date()) {
        await tx.serverTeamInvite.update({ where: { id: invite.id }, data: { status: "EXPIRED", respondedAt: new Date() } });
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
          create: { serverId: invite.serverId, userId: request.user!.id, invitedById: invite.inviterId, role: invite.role },
          update: { role: invite.role, invitedById: invite.inviterId, acceptedAt: new Date() },
        });
      }
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
      prisma.serverTeamMember.findMany({ where: { serverId }, include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } }, orderBy: { createdAt: "asc" } }),
      prisma.serverTeamInvite.findMany({ where: { serverId, status: "PENDING", expiresAt: { gt: new Date() } }, include: { invitee: { select: { id: true, username: true, displayName: true, avatarUrl: true } } }, orderBy: { createdAt: "desc" } }),
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
  app.patch("/v1/owner/servers/:serverId/team/members/:memberId", { preHandler: app.authenticate }, async (request) => {
    const { serverId, memberId } = request.params as { serverId: string; memberId: string };
    await requireOwnedServer(serverId, request.user!.id);
    const { role } = TeamMemberRoleInputSchema.parse(request.body);
    return prisma.serverTeamMember.update({ where: { id: memberId, serverId }, data: { role } });
  });
  app.delete("/v1/owner/servers/:serverId/team/members/:memberId", { preHandler: app.authenticate }, async (request, reply) => {
    const { serverId, memberId } = request.params as { serverId: string; memberId: string };
    await requireOwnedServer(serverId, request.user!.id);
    await prisma.serverTeamMember.delete({ where: { id: memberId, serverId } });
    return reply.code(204).send();
  });
  app.delete("/v1/owner/servers/:serverId/team/invites/:inviteId", { preHandler: app.authenticate }, async (request, reply) => {
    const { serverId, inviteId } = request.params as { serverId: string; inviteId: string };
    await requireOwnedServer(serverId, request.user!.id);
    await prisma.serverTeamInvite.update({ where: { id: inviteId, serverId }, data: { status: "REVOKED", respondedAt: new Date() } });
    return reply.code(204).send();
  });
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
      const totalCents = entries.reduce(
        (total, entry) =>
          total + (entry.direction === "CREDIT" ? entry.amountCents : -entry.amountCents),
        0,
      );
      return {
        totalCents,
        entries,
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
          message: "Campaign balance checkout is unavailable until a production payment provider is configured.",
        });
      }
      const { amountCents } = request.body as { amountCents: number };
      if (!Number.isInteger(amountCents) || amountCents < 1000 || amountCents > 1_000_000) {
        return reply
          .code(400)
          .send({
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
      const campaigns = await prisma.campaign.findMany({
        where: { ownerId: request.user!.id },
        select: { id: true },
      });
      const campaignIds = campaigns.map(({ id }) => id);
      const events = await prisma.analyticsEvent.groupBy({
        by: ["type"],
        where: { campaignId: { in: campaignIds } },
        _count: { _all: true },
      });
      return { events, retention: { day1: null, day7: null, label: "Insufficient data" } };
    },
  );

  app.get(
    "/v1/admin/overview",
    { preHandler: app.requirePermission("campaign:review") },
    async () => {
      const [users, servers, campaigns, withdrawals, cases] = await prisma.$transaction([
        prisma.user.count(),
        prisma.server.count(),
        prisma.campaign.count(),
        prisma.withdrawalRequest.count({
          where: { status: { in: ["REQUESTED", "UNDER_REVIEW"] } },
        }),
        prisma.moderationCase.count({ where: { status: "OPEN" } }),
      ]);
      return { users, servers, campaigns, pendingWithdrawals: withdrawals, openCases: cases };
    },
  );
  app.get(
    "/v1/admin/campaigns",
    { preHandler: app.requirePermission("campaign:review") },
    async () =>
      prisma.campaign.findMany({
        where: { status: { in: ["SUBMITTED", "UNDER_REVIEW", "CHANGES_REQUESTED"] } },
        include: {
          server: { select: { id: true, name: true, slug: true, verificationStatus: true, moderationStatus: true } },
          owner: { select: { id: true, username: true, displayName: true, email: true, status: true } },
          milestones: true,
        },
        orderBy: { createdAt: "asc" },
      }),
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
    "/v1/admin/withdrawals",
    { preHandler: app.requirePermission("withdrawal:review") },
    async () =>
      prisma.withdrawalRequest.findMany({
        include: {
          player: {
            select: {
              id: true,
              username: true,
              displayName: true,
              email: true,
              status: true,
              reputationScore: true,
              reputationTier: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      }),
  );
  app.post(
    "/v1/admin/withdrawals/:id/transition",
    { preHandler: app.requirePermission("withdrawal:review") },
    async (request) => {
      const { id } = request.params as { id: string };
      const { status, reason } = withdrawalTransitionSchema.parse(request.body);
      const updated = await withdrawalService.transition(request.user!.id, id, status, reason);
      if (status === "PROCESSING") {
        const recipient = await payoutProvider.createRecipient({
          userId: updated.playerId,
          destinationReference: updated.payoutDestinationReference,
        });
        const payout = await payoutProvider.createPayout({
          recipientId: recipient.id,
          amountCents: updated.requestedAmountCents - updated.feesCents,
          currency: updated.currency,
        });
        return prisma.withdrawalRequest.update({
          where: { id },
          data: { providerTransactionReference: payout.id },
        });
      }
      return updated;
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
      earnings: await prisma.earningsLedgerEntry.findMany({
        include: { user: { select: { id: true, username: true, displayName: true, status: true } } },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      sparks: await prisma.sparksLedgerEntry.findMany({
        include: { user: { select: { id: true, username: true, displayName: true, status: true } } },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      campaignCredits: await prisma.campaignCreditLedgerEntry.findMany({
        include: { owner: { select: { id: true, username: true, displayName: true, status: true } } },
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
        include: { actor: { select: { id: true, username: true, displayName: true, roles: true } } },
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
      return campaignService.reviewCompletion(request.user!.id, id, approved, reason);
    },
  );

  app.post(
    "/v1/integrations/server/events",
    { config: { rateLimit: { max: 200, timeWindow: "1 minute" } } },
    (_request, reply) => reply.code(410).send({
      code: "ENDPOINT_RETIRED",
      message: "Use a server-scoped plugin token with /v1/plugin/events.",
    }),
  );
  app.post(
    "/v1/integrations/client/events",
    { config: { rateLimit: { max: 100, timeWindow: "1 minute" } } },
    (_request, reply) => reply.code(410).send({
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
