import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "@nortix/database";
import {
  AnalyticsEventSchema,
  CampaignInputSchema,
  JoinCampaignSchema,
  MilestoneSubmissionSchema,
  ServerInputSchema,
  WithdrawalInputSchema,
} from "@nortix/shared";
import { IntegrationEventSchema } from "@nortix/plugin-sdk";
import { MockPaymentProvider, MockPayoutProvider } from "@nortix/integrations";
import type { FastifyInstance } from "fastify";
import type { Env } from "../config/env.js";
import { CampaignService } from "./campaigns/service.js";
import { WithdrawalService } from "./withdrawals/service.js";

const campaignService = new CampaignService();
const withdrawalService = new WithdrawalService();

const parsePagination = (query: Record<string, unknown>) => ({
  page: Math.max(1, Number(query.page) || 1),
  pageSize: Math.min(50, Math.max(1, Number(query.pageSize) || 12)),
});

export const registerRoutes = async (app: FastifyInstance, env: Env) => {
  const paymentProvider = new MockPaymentProvider(env.PAYMENT_WEBHOOK_SECRET);
  const payoutProvider = new MockPayoutProvider();
  app.get("/health", async () => ({ status: "ok", service: "nortix-api" }));

  app.get("/v1/auth/me", { preHandler: app.authenticate }, async (request) => request.user);
  app.get("/v1/users/me", { preHandler: app.authenticate }, async (request) => request.user);
  app.patch("/v1/users/me/profile", { preHandler: app.authenticate }, async (request) => {
    const input = request.body as {
      displayName?: string;
      avatarUrl?: string;
      publicProfile?: object;
    };
    return prisma.user.update({
      where: { id: request.user!.id },
      data: {
        displayName: input.displayName,
        avatarUrl: input.avatarUrl,
        publicProfile: input.publicProfile,
      },
    });
  });
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
        badgeAwards: { include: { badge: true } },
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
        include: {
          _count: { select: { campaigns: true, reviews: true } },
          reviews: { select: { rating: true } },
        },
        orderBy: [{ online: "desc" }, { playerCount: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.server.count({ where }),
    ]);
    return { items, page, pageSize, total };
  });
  app.get("/v1/servers/:slug", async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const server = await prisma.server.findFirst({
      where: { slug, publicListing: true },
      include: {
        campaigns: {
          where: { status: "ACTIVE" },
          include: { milestones: { orderBy: { order: "asc" } } },
        },
        reviews: {
          where: { moderationStatus: "APPROVED" },
          include: { player: { select: { username: true, displayName: true } } },
        },
      },
    });
    return server ?? reply.code(404).send({ code: "NOT_FOUND", message: "Server not found." });
  });
  app.post(
    "/v1/servers",
    { preHandler: app.requirePermission("server:manage") },
    async (request, reply) => {
      const input = ServerInputSchema.parse(request.body);
      const slug = `${input.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")}-${crypto.randomUUID().slice(0, 5)}`;
      const server = await prisma.server.create({
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
          websiteUrl: input.websiteUrl,
          discordUrl: input.discordUrl,
          screenshotUrls: [],
        },
      });
      return reply.code(201).send(server);
    },
  );
  app.post(
    "/v1/servers/:id/verification",
    { preHandler: app.requirePermission("server:manage") },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const server = await prisma.server.findFirst({ where: { id, ownerId: request.user!.id } });
      if (!server) return reply.code(404).send({ code: "NOT_FOUND", message: "Server not found." });
      const challenge = await prisma.serverVerification.create({
        data: {
          serverId: id,
          provider: "MANUAL_REVIEW",
          challenge: {
            instructions: "Upload or describe ownership evidence for moderator review.",
            token: crypto.randomUUID(),
          },
        },
      });
      return reply.code(201).send(challenge);
    },
  );

  app.get("/v1/campaigns", async (request) => {
    const { page, pageSize } = parsePagination(request.query as Record<string, unknown>);
    const where = {
      status: "ACTIVE" as const,
      startsAt: { lte: new Date() },
      endsAt: { gt: new Date() },
    };
    const [items, total] = await prisma.$transaction([
      prisma.campaign.findMany({
        where,
        include: {
          server: true,
          milestones: { orderBy: { order: "asc" } },
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
      where: { id, status: { in: ["ACTIVE", "SCHEDULED", "COMPLETED"] } },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        category: true,
        publicRewardCents: true,
        startsAt: true,
        endsAt: true,
        maxParticipants: true,
        versionRequirements: true,
        regionRestrictions: true,
        eligibilityRules: true,
        server: true,
        milestones: { orderBy: { order: "asc" } },
        _count: { select: { participations: true } },
      },
    });
    return campaign ?? reply.code(404).send({ code: "NOT_FOUND", message: "Campaign not found." });
  });
  app.post("/v1/campaigns/:id/join", { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = JoinCampaignSchema.parse(request.body);
    const result = await campaignService.join(request.user!.id, id, input.minecraftIdentityId);
    return reply.code(201).send(result);
  });
  app.get("/v1/campaigns/:id/participation", { preHandler: app.authenticate }, async (request) => {
    const { id } = request.params as { id: string };
    return prisma.campaignParticipation.findUnique({
      where: { playerId_campaignId: { playerId: request.user!.id, campaignId: id } },
      include: {
        completions: true,
        campaign: { include: { milestones: { orderBy: { order: "asc" } } } },
      },
    });
  });

  app.get("/v1/participations", { preHandler: app.authenticate }, async (request) =>
    prisma.campaignParticipation.findMany({
      where: { playerId: request.user!.id },
      include: { campaign: { include: { server: true, milestones: true } }, completions: true },
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
    const { itemId } = request.body as { itemId: string };
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
    });
    return reply.code(201).send(purchase);
  });

  app.get(
    "/v1/owner/servers",
    { preHandler: app.requirePermission("server:manage") },
    async (request) =>
      prisma.server.findMany({
        where: { ownerId: request.user!.id },
        include: { campaigns: true },
      }),
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
        include: { server: true, owner: true, milestones: true },
        orderBy: { createdAt: "asc" },
      }),
  );
  app.post(
    "/v1/admin/campaigns/:id/review",
    { preHandler: app.requirePermission("campaign:review") },
    async (request) => {
      const { id } = request.params as { id: string };
      const body = request.body as {
        action: "APPROVE" | "REQUEST_CHANGES" | "REJECT" | "PAUSE" | "ARCHIVE";
        note?: string;
      };
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
        include: { player: true },
        orderBy: { createdAt: "asc" },
      }),
  );
  app.post(
    "/v1/admin/withdrawals/:id/transition",
    { preHandler: app.requirePermission("withdrawal:review") },
    async (request) => {
      const { id } = request.params as { id: string };
      const { status, reason } = request.body as { status: string; reason?: string };
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
        include: { user: true },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      sparks: await prisma.sparksLedgerEntry.findMany({
        include: { user: true },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      campaignCredits: await prisma.campaignCreditLedgerEntry.findMany({
        include: { owner: true },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    }),
  );
  app.get(
    "/v1/admin/audit-logs",
    { preHandler: app.requirePermission("campaign:review") },
    async () =>
      prisma.auditLog.findMany({
        include: { actor: true },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
  );
  app.post(
    "/v1/admin/completions/:id/review",
    { preHandler: app.requirePermission("reward:approve") },
    async (request) => {
      const { id } = request.params as { id: string };
      const { approved, reason } = request.body as { approved: boolean; reason?: string };
      return campaignService.reviewCompletion(request.user!.id, id, approved, reason);
    },
  );

  const integrationHandler = async (
    request: any,
    reply: any,
    source: "SERVER_PLUGIN" | "CLIENT_MOD",
  ) => {
    const timestamp = String(request.headers["x-nortix-timestamp"] ?? "");
    const signature = String(request.headers["x-nortix-signature"] ?? "");
    const idempotencyKey = String(request.headers["idempotency-key"] ?? "");
    if (!timestamp || Math.abs(Date.now() - Date.parse(timestamp)) > 5 * 60_000) {
      return reply
        .code(401)
        .send({
          code: "REPLAY_REJECTED",
          message: "Event timestamp is outside the allowed window.",
        });
    }
    const raw = JSON.stringify(request.body);
    const expected = createHmac("sha256", env.INTEGRATION_SIGNING_SECRET)
      .update(`${timestamp}.${raw}`)
      .digest("hex");
    if (
      expected.length !== signature.length ||
      !timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
    ) {
      return reply
        .code(401)
        .send({ code: "INVALID_SIGNATURE", message: "Integration signature is invalid." });
    }
    const input = IntegrationEventSchema.parse(request.body);
    const event = AnalyticsEventSchema.parse({ ...input, source });
    const stored = await prisma.analyticsEvent.upsert({
      where: { id: event.id },
      update: {},
      create: { ...event, metadata: event.metadata as any },
    });
    return reply.code(202).send({ accepted: true, eventId: stored.id, idempotencyKey });
  };
  app.post(
    "/v1/integrations/server/events",
    { config: { rateLimit: { max: 200, timeWindow: "1 minute" } } },
    (request, reply) => integrationHandler(request, reply, "SERVER_PLUGIN"),
  );
  app.post(
    "/v1/integrations/client/events",
    { config: { rateLimit: { max: 100, timeWindow: "1 minute" } } },
    (request, reply) => integrationHandler(request, reply, "CLIENT_MOD"),
  );
  app.get(
    "/v1/integrations/campaigns/:campaignId/config",
    { preHandler: app.authenticate },
    async (request) => {
      const { campaignId } = request.params as { campaignId: string };
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
