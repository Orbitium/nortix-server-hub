import { prisma, Prisma } from "@nortix/database";
import type {
  AdminServerStorePayoutAction,
  AdminServerStorePayoutProfileInput,
  OwnerServerStorePayoutInput,
  OwnerServerStoreInput,
  OwnerServerStoreItemInput,
  OwnerServerStoreItemUpdate,
  ServerStorePurchaseInput,
  ServerStorePurchaseMutation,
} from "@nortix/shared";
import { createNotification } from "../notifications/service.js";
import {
  calculateOwnerProceedsCents,
  canPublishServerStore,
  renderServerStoreCommands,
} from "./policy.js";

const availableSparks = (
  rows: Array<{ direction: "CREDIT" | "DEBIT"; _sum: { amount: number | null } }>,
) =>
  rows.reduce(
    (total, row) =>
      total + (row.direction === "CREDIT" ? (row._sum.amount ?? 0) : -(row._sum.amount ?? 0)),
    0,
  );

const proceedsBalance = (
  entries: Array<{ direction: "CREDIT" | "DEBIT"; amountCents: number }>,
) =>
  entries.reduce(
    (total, entry) =>
      total + (entry.direction === "CREDIT" ? entry.amountCents : -entry.amountCents),
    0,
  );

const catalogSelect = {
  id: true,
  name: true,
  description: true,
  logoUrl: true,
  server: {
    select: {
      id: true,
      slug: true,
      name: true,
      logoUrl: true,
      online: true,
      pluginCapabilities: true,
    },
  },
  items: {
    where: { status: "PUBLISHED" as const, OR: [{ stockQuantity: null }, { stockQuantity: { gt: 0 } }] },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      category: true,
      sparksPrice: true,
      imageUrls: true,
      stockQuantity: true,
      maxPerPurchase: true,
    },
    orderBy: [{ sortOrder: "asc" as const }, { name: "asc" as const }],
  },
} satisfies Prisma.ServerStoreSelect;

const purchaseSelect = {
  id: true,
  status: true,
  quantity: true,
  priceSparks: true,
  recipientMinecraftUsername: true,
  giftMessage: true,
  refundEligibleUntil: true,
  redeemedAt: true,
  deliveredAt: true,
  failedAt: true,
  refundedAt: true,
  createdAt: true,
  buyer: { select: { username: true, displayName: true } },
  recipient: { select: { username: true, displayName: true } },
  item: {
    select: {
      id: true,
      name: true,
      category: true,
      imageUrls: true,
      store: {
        select: {
          id: true,
          name: true,
          server: { select: { id: true, slug: true, name: true } },
        },
      },
    },
  },
  delivery: {
    select: { id: true, status: true, updatedAt: true },
  },
} satisfies Prisma.ServerStorePurchaseSelect;

const ownerPurchaseSelect = {
  id: true,
  status: true,
  quantity: true,
  priceSparks: true,
  recipientMinecraftUsername: true,
  deliveredAt: true,
  failedAt: true,
  refundedAt: true,
  createdAt: true,
  item: { select: { id: true, name: true, imageUrls: true } },
  delivery: {
    select: { id: true, status: true, attemptCount: true, lastError: true, updatedAt: true },
  },
} satisfies Prisma.ServerStorePurchaseSelect;

export class ServerStoreService {
  constructor(
    private readonly proceedsCentsPerThousandSparks = 0,
    private readonly payoutRequestsEnabled = false,
    private readonly minimumPayoutCents = 1_000,
  ) {}
  async catalog() {
    const stores = await prisma.serverStore.findMany({
      where: {
        available: true,
        server: {
          claimed: true,
          verificationStatus: "VERIFIED",
          moderationStatus: "APPROVED",
          publicListing: true,
          pluginLastSeenAt: { gte: new Date(Date.now() - 10 * 60_000) },
          integrationKeys: {
            some: {
              algorithm: "ECDSA_P256_SHA256",
              revokedAt: null,
              scopes: { has: "plugin:events" },
            },
          },
        },
        items: {
          some: { status: "PUBLISHED", OR: [{ stockQuantity: null }, { stockQuantity: { gt: 0 } }] },
        },
      },
      select: catalogSelect,
      orderBy: { name: "asc" },
    });
    return stores
      .filter(
        (store) =>
          Array.isArray(store.server.pluginCapabilities) &&
          store.server.pluginCapabilities.length > 0,
      )
      .map(({ server, ...store }) => {
        const { pluginCapabilities: _pluginCapabilities, ...publicServer } = server;
        return { ...store, server: publicServer };
      });
  }

  ownerStore(serverId: string) {
    return prisma.serverStore.findUnique({
      where: { serverId },
      select: {
        id: true,
        serverId: true,
        name: true,
        description: true,
        logoUrl: true,
        available: true,
        createdAt: true,
        updatedAt: true,
        items: {
          select: {
            id: true,
            slug: true,
            name: true,
            description: true,
            category: true,
            sparksPrice: true,
            imageUrls: true,
            stockQuantity: true,
            maxPerPurchase: true,
            commandTemplates: true,
            status: true,
            sortOrder: true,
            createdAt: true,
            updatedAt: true,
            _count: { select: { purchases: true } },
          },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        },
      },
    });
  }

  async upsertStore(
    actorId: string,
    serverId: string,
    input: OwnerServerStoreInput,
    requestId: string,
  ) {
    return prisma.$transaction(async (tx) => {
      const server = await tx.server.findUnique({
        where: { id: serverId },
        select: {
          id: true,
          claimed: true,
          verificationStatus: true,
          publicListing: true,
          pluginLastSeenAt: true,
          pluginCapabilities: true,
          integrationKeys: {
            where: {
              algorithm: "ECDSA_P256_SHA256",
              revokedAt: null,
              scopes: { has: "plugin:events" },
            },
            select: { id: true },
            take: 1,
          },
        },
      });
      if (!server) throw new Error("Server not found.");
      if (
        input.available &&
        !canPublishServerStore({
          ...server,
          hasActiveSigningKey: server.integrationKeys.length > 0,
        })
      ) {
        throw new Error(
          "Publish this server in discovery, complete Nortix verification, and connect its signed plugin before publishing the market.",
        );
      }
      const before = await tx.serverStore.findUnique({ where: { serverId } });
      const store = await tx.serverStore.upsert({
        where: { serverId },
        create: { ...input, serverId },
        update: input,
      });
      await tx.auditLog.create({
        data: {
          actorId,
          action: before ? "server_store.updated" : "server_store.created",
          entityType: "ServerStore",
          entityId: store.id,
          requestId,
          beforeSnapshot: before
            ? { name: before.name, available: before.available }
            : undefined,
          afterSnapshot: { serverId, name: store.name, available: store.available },
        },
      });
      return store;
    });
  }

  async createItem(
    actorId: string,
    serverId: string,
    input: OwnerServerStoreItemInput,
    requestId: string,
  ) {
    return prisma.$transaction(async (tx) => {
      const store = await tx.serverStore.findUnique({ where: { serverId }, select: { id: true } });
      if (!store) throw new Error("Create the server store before adding items.");
      if (input.status === "PUBLISHED" && input.imageUrls.length === 0) {
        throw new Error("A published store item requires at least one image.");
      }
      await this.assertOwnedMedia(tx, serverId, input.imageUrls);
      const item = await tx.serverStoreItem.create({ data: { ...input, storeId: store.id } });
      await tx.auditLog.create({
        data: {
          actorId,
          action: "server_store_item.created",
          entityType: "ServerStoreItem",
          entityId: item.id,
          requestId,
          afterSnapshot: {
            serverId,
            slug: item.slug,
            category: item.category,
            sparksPrice: item.sparksPrice,
            stockQuantity: item.stockQuantity,
            commandCount: item.commandTemplates.length,
            status: item.status,
          },
        },
      });
      return item;
    });
  }

  async updateItem(
    actorId: string,
    serverId: string,
    itemId: string,
    input: OwnerServerStoreItemUpdate,
    requestId: string,
  ) {
    return prisma.$transaction(async (tx) => {
      const before = await tx.serverStoreItem.findFirst({
        where: { id: itemId, store: { serverId } },
      });
      if (!before) throw new Error("Server store item not found.");
      if (
        input.status === "PUBLISHED" &&
        (input.imageUrls ?? before.imageUrls).length === 0
      ) {
        throw new Error("A published store item requires at least one image.");
      }
      if (input.imageUrls) await this.assertOwnedMedia(tx, serverId, input.imageUrls);
      const item = await tx.serverStoreItem.update({ where: { id: itemId }, data: input });
      await tx.auditLog.create({
        data: {
          actorId,
          action: "server_store_item.updated",
          entityType: "ServerStoreItem",
          entityId: item.id,
          requestId,
          beforeSnapshot: {
            sparksPrice: before.sparksPrice,
            category: before.category,
            stockQuantity: before.stockQuantity,
            status: before.status,
          },
          afterSnapshot: {
            sparksPrice: item.sparksPrice,
            category: item.category,
            stockQuantity: item.stockQuantity,
            status: item.status,
          },
        },
      });
      return item;
    });
  }

  private async assertOwnedMedia(
    tx: Prisma.TransactionClient,
    serverId: string,
    imageUrls: string[],
  ) {
    const ids = imageUrls.flatMap((url) => {
      const match = url.match(
        /^\/api\/v1\/media\/store-items\/([0-9a-f-]{36})\.(?:png|jpe?g|webp)$/i,
      );
      return match?.[1] ? [match[1]] : [];
    });
    if (ids.length === 0) return;
    const ownedCount = await tx.serverStoreMediaAsset.count({
      where: { id: { in: [...new Set(ids)] }, serverId },
    });
    if (ownedCount !== new Set(ids).size) {
      throw new Error("A store item image does not belong to this server.");
    }
  }

  ownerPurchases(serverId: string) {
    return prisma.serverStorePurchase.findMany({
      where: { item: { store: { serverId } } },
      select: ownerPurchaseSelect,
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  }

  async ownerSales(ownerId: string) {
    const now = new Date();
    const since = new Date(now.getTime() - 29 * 86_400_000);
    const [purchases, purchaseStats, recentDeliveries, proceeds, payoutProfile, payoutRequests] = await Promise.all([
      prisma.serverStorePurchase.findMany({
        where: { item: { store: { server: { ownerId } } } },
        select: {
          id: true,
          status: true,
          quantity: true,
          priceSparks: true,
          ownerProceedsCents: true,
          createdAt: true,
          deliveredAt: true,
          item: {
            select: {
              name: true,
              store: { select: { name: true, server: { select: { id: true, name: true } } } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 500,
      }),
      prisma.serverStorePurchase.groupBy({
        by: ["status"],
        where: { item: { store: { server: { ownerId } } } },
        _count: { _all: true },
        _sum: { ownerProceedsCents: true },
      }),
      prisma.serverStorePurchase.findMany({
        where: {
          item: { store: { server: { ownerId } } },
          status: "DELIVERED",
          deliveredAt: { gte: since },
        },
        select: { deliveredAt: true, ownerProceedsCents: true },
      }),
      prisma.serverStoreProceedsEntry.findMany({
        where: { ownerId, currency: "USD" },
        select: {
          id: true,
          direction: true,
          amountCents: true,
          type: true,
          availableAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 1_000,
      }),
      prisma.serverStorePayoutProfile.findUnique({
        where: { ownerId },
        select: {
          id: true,
          provider: true,
          displayLabel: true,
          verifiedAt: true,
          disabledAt: true,
        },
      }),
      prisma.serverStorePayoutRequest.findMany({
        where: { ownerId },
        select: {
          id: true,
          requestedCents: true,
          currency: true,
          status: true,
          reason: true,
          createdAt: true,
          reviewedAt: true,
          completedAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    ]);
    const eligibleEntries = proceeds.filter((entry) => entry.availableAt <= now);
    const pendingEntries = proceeds.filter(
      (entry) => entry.direction === "CREDIT" && entry.availableAt > now,
    );
    const countFor = (status: "PURCHASED" | "PENDING_DELIVERY" | "DELIVERED") =>
      purchaseStats.find((entry) => entry.status === status)?._count._all ?? 0;
    const projectedUndeliveredCents = purchaseStats
      .filter(
        (entry) => entry.status === "PURCHASED" || entry.status === "PENDING_DELIVERY",
      )
      .reduce((total, entry) => total + (entry._sum.ownerProceedsCents ?? 0), 0);
    const chart = Array.from({ length: 30 }, (_, offset) => {
      const day = new Date(since.getTime() + offset * 86_400_000);
      const key = day.toISOString().slice(0, 10);
      const matching = recentDeliveries.filter(
        (purchase) => purchase.deliveredAt?.toISOString().slice(0, 10) === key,
      );
      return {
        date: key,
        deliveredOrders: matching.length,
        estimatedProceedsCents: matching.reduce(
          (total, purchase) => total + purchase.ownerProceedsCents,
          0,
        ),
      };
    });
    return {
      currency: "USD",
      language: {
        notice:
          "Displayed proceeds are estimates and may remain subject to review, delivery confirmation, applicable holds, adjustments, and provider requirements.",
      },
      configuration: {
        requestsEnabled: this.payoutRequestsEnabled,
        minimumRequestCents: this.minimumPayoutCents,
        payoutProfileReady: Boolean(
          payoutProfile?.verifiedAt && !payoutProfile.disabledAt,
        ),
      },
      summary: {
        totalOrders: purchaseStats.reduce((total, entry) => total + entry._count._all, 0),
        purchased: countFor("PURCHASED"),
        pendingDelivery: countFor("PENDING_DELIVERY"),
        delivered: countFor("DELIVERED"),
        availableCents: Math.max(0, proceedsBalance(eligibleEntries)),
        pendingCents:
          pendingEntries.reduce((total, entry) => total + entry.amountCents, 0) +
          projectedUndeliveredCents,
      },
      chart,
      sales: purchases,
      payoutProfile,
      payoutRequests,
    };
  }

  async requestPayout(
    ownerId: string,
    input: OwnerServerStorePayoutInput,
    requestId: string,
  ) {
    if (!this.payoutRequestsEnabled) {
      throw new Error(
        "Store proceeds requests are unavailable until a reviewed payout provider is configured.",
      );
    }
    if (input.amountCents < this.minimumPayoutCents) {
      throw new Error(
        `Store proceeds requests must be at least ${this.minimumPayoutCents} cents.`,
      );
    }
    return prisma.$transaction(
      async (tx) => {
        const previous = await tx.serverStorePayoutRequest.findUnique({
          where: { idempotencyKey: input.idempotencyKey },
          select: {
            id: true,
            ownerId: true,
            requestedCents: true,
            currency: true,
            status: true,
            createdAt: true,
          },
        });
        if (previous) {
          if (previous.ownerId !== ownerId) {
            throw new Error("Store proceeds request could not be completed.");
          }
          return previous;
        }
        const [ownedStore, profile, entries] = await Promise.all([
          tx.serverStore.findFirst({
            where: { server: { ownerId } },
            select: { id: true },
          }),
          tx.serverStorePayoutProfile.findUnique({
            where: { ownerId },
            select: { id: true, verifiedAt: true, disabledAt: true },
          }),
          tx.serverStoreProceedsEntry.findMany({
            where: { ownerId, currency: "USD", availableAt: { lte: new Date() } },
            select: { direction: true, amountCents: true },
          }),
        ]);
        if (!ownedStore) throw new Error("No owned server store was found.");
        if (!profile?.verifiedAt || profile.disabledAt) {
          throw new Error("A reviewed payout profile is required for store proceeds requests.");
        }
        if (proceedsBalance(entries) < input.amountCents) {
          throw new Error("The requested amount is not currently eligible.");
        }
        const payout = await tx.serverStorePayoutRequest.create({
          data: {
            ownerId,
            payoutProfileId: profile.id,
            requestedCents: input.amountCents,
            currency: "USD",
            idempotencyKey: input.idempotencyKey,
          },
          select: {
            id: true,
            requestedCents: true,
            currency: true,
            status: true,
            createdAt: true,
          },
        });
        await Promise.all([
          tx.serverStoreProceedsEntry.create({
            data: {
              ownerId,
              payoutRequestId: payout.id,
              direction: "DEBIT",
              amountCents: input.amountCents,
              currency: "USD",
              type: "WITHDRAWAL_RESERVATION",
              availableAt: new Date(),
              idempotencyKey: `server-store-payout-reservation:${payout.id}`,
              internalNote: "Reserved while a store proceeds request is reviewed.",
            },
          }),
          tx.auditLog.create({
            data: {
              actorId: ownerId,
              action: "server_store_payout.requested",
              entityType: "ServerStorePayoutRequest",
              entityId: payout.id,
              requestId,
              afterSnapshot: { requestedCents: input.amountCents, currency: "USD" },
            },
          }),
        ]);
        return payout;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  adminPayoutRequests() {
    return prisma.serverStorePayoutRequest.findMany({
      select: {
        id: true,
        requestedCents: true,
        currency: true,
        status: true,
        reason: true,
        providerReference: true,
        createdAt: true,
        reviewedAt: true,
        completedAt: true,
        owner: { select: { id: true, username: true, displayName: true } },
        payoutProfile: {
          select: {
            provider: true,
            displayLabel: true,
            providerAccountReference: true,
            verifiedAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 250,
    });
  }

  async upsertPayoutProfile(
    actorId: string,
    input: AdminServerStorePayoutProfileInput,
    requestId: string,
  ) {
    return prisma.$transaction(async (tx) => {
      const owner = await tx.user.findFirst({
        where: {
          username: { equals: input.ownerUsername, mode: "insensitive" },
          status: "ACTIVE",
          roles: { has: "SERVER_OWNER" },
        },
        select: { id: true },
      });
      if (!owner) throw new Error("Eligible server owner not found.");
      const profile = await tx.serverStorePayoutProfile.upsert({
        where: { ownerId: owner.id },
        create: {
          ownerId: owner.id,
          provider: input.provider,
          providerAccountReference: input.providerAccountReference,
          displayLabel: input.displayLabel,
          verifiedAt: input.verified ? new Date() : null,
        },
        update: {
          provider: input.provider,
          providerAccountReference: input.providerAccountReference,
          displayLabel: input.displayLabel,
          verifiedAt: input.verified ? new Date() : null,
          disabledAt: null,
        },
        select: {
          id: true,
          ownerId: true,
          provider: true,
          displayLabel: true,
          verifiedAt: true,
        },
      });
      await tx.auditLog.create({
        data: {
          actorId,
          action: "server_store_payout_profile.updated",
          entityType: "ServerStorePayoutProfile",
          entityId: profile.id,
          requestId,
          afterSnapshot: {
            ownerId: owner.id,
            provider: input.provider,
            displayLabel: input.displayLabel,
            verified: input.verified,
          },
        },
      });
      return profile;
    });
  }

  async actOnPayout(
    actorId: string,
    payoutId: string,
    input: AdminServerStorePayoutAction,
    requestId: string,
  ) {
    return prisma.$transaction(async (tx) => {
      const payout = await tx.serverStorePayoutRequest.findUnique({
        where: { id: payoutId },
        select: { id: true, ownerId: true, requestedCents: true, status: true },
      });
      if (!payout) throw new Error("Store proceeds request not found.");
      const transition: Record<
        AdminServerStorePayoutAction["action"],
        { from: string[]; to: "UNDER_REVIEW" | "APPROVED" | "PROCESSING" | "PAID" | "REJECTED" | "FAILED" }
      > = {
        UNDER_REVIEW: { from: ["REQUESTED"], to: "UNDER_REVIEW" },
        APPROVE: { from: ["REQUESTED", "UNDER_REVIEW"], to: "APPROVED" },
        MARK_PROCESSING: { from: ["APPROVED"], to: "PROCESSING" },
        MARK_PAID: { from: ["APPROVED", "PROCESSING"], to: "PAID" },
        REJECT: { from: ["REQUESTED", "UNDER_REVIEW", "APPROVED"], to: "REJECTED" },
        FAIL: { from: ["APPROVED", "PROCESSING"], to: "FAILED" },
      };
      const next = transition[input.action];
      if (!next.from.includes(payout.status)) {
        throw new Error("This store proceeds request cannot move to that status.");
      }
      const releasesReservation = next.to === "REJECTED" || next.to === "FAILED";
      const now = new Date();
      await Promise.all([
        tx.serverStorePayoutRequest.update({
          where: { id: payout.id },
          data: {
            status: next.to,
            reason: input.reason,
            providerReference: input.providerReference,
            reviewedById: actorId,
            reviewedAt: now,
            completedAt: next.to === "PAID" || releasesReservation ? now : undefined,
          },
        }),
        ...(releasesReservation
          ? [
              tx.serverStoreProceedsEntry.create({
                data: {
                  ownerId: payout.ownerId,
                  payoutRequestId: payout.id,
                  direction: "CREDIT" as const,
                  amountCents: payout.requestedCents,
                  currency: "USD",
                  type: "WITHDRAWAL_RELEASE" as const,
                  availableAt: now,
                  idempotencyKey: `server-store-payout-release:${payout.id}`,
                  internalNote: "Released after the proceeds request did not complete.",
                },
              }),
            ]
          : []),
        tx.auditLog.create({
          data: {
            actorId,
            action: `server_store_payout.${input.action.toLowerCase()}`,
            entityType: "ServerStorePayoutRequest",
            entityId: payout.id,
            requestId,
            reason: input.reason,
            beforeSnapshot: { status: payout.status },
            afterSnapshot: {
              status: next.to,
              providerReferenceRecorded: Boolean(input.providerReference),
              reservationReleased: releasesReservation,
            },
          },
        }),
      ]);
      return { id: payout.id, status: next.to };
    });
  }

  listMine(userId: string) {
    return prisma.serverStorePurchase.findMany({
      where: { OR: [{ buyerId: userId }, { recipientId: userId }] },
      select: purchaseSelect,
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  async purchase(buyerId: string, input: ServerStorePurchaseInput, requestId: string) {
    return prisma.$transaction(
      async (tx) => {
        const previous = await tx.serverStorePurchase.findUnique({
          where: { idempotencyKey: input.idempotencyKey },
          select: { buyerId: true, ...purchaseSelect },
        });
        if (previous) {
          if (previous.buyerId !== buyerId) throw new Error("Purchase request could not be completed.");
          const { buyerId: _buyerId, ...safePurchase } = previous;
          return safePurchase;
        }
        const item = await tx.serverStoreItem.findFirst({
          where: {
            id: input.itemId,
            status: "PUBLISHED",
            store: {
              available: true,
              server: {
                claimed: true,
                verificationStatus: "VERIFIED",
                moderationStatus: "APPROVED",
                publicListing: true,
                pluginLastSeenAt: { gte: new Date(Date.now() - 10 * 60_000) },
                integrationKeys: {
                  some: {
                    algorithm: "ECDSA_P256_SHA256",
                    revokedAt: null,
                    scopes: { has: "plugin:events" },
                  },
                },
              },
            },
          },
          select: {
            id: true,
            name: true,
            sparksPrice: true,
            stockQuantity: true,
            maxPerPurchase: true,
            commandTemplates: true,
            store: {
              select: {
                id: true,
                serverId: true,
                server: {
                  select: { name: true, ownerId: true, pluginCapabilities: true },
                },
              },
            },
          },
        });
        if (!item) throw new Error("Server store item not found.");
        if (
          !Array.isArray(item.store.server.pluginCapabilities) ||
          item.store.server.pluginCapabilities.length === 0
        ) {
          throw new Error("Server store delivery requires a connected Paper plugin.");
        }
        if (input.quantity > item.maxPerPurchase) {
          throw new Error(`This item is limited to ${item.maxPerPurchase} per purchase.`);
        }
        if (item.stockQuantity !== null && item.stockQuantity < input.quantity) {
          throw new Error("The requested server store quantity is no longer available.");
        }
        const recipient = input.recipientUsername
          ? await tx.user.findFirst({
              where: { username: { equals: input.recipientUsername, mode: "insensitive" }, status: "ACTIVE" },
              select: { id: true, username: true },
            })
          : await tx.user.findUnique({
              where: { id: buyerId },
              select: { id: true, username: true },
            });
        if (!recipient) throw new Error("The recipient cannot receive this server item.");
        const [buyer, crackedIdentity, premiumIdentity, balanceRows] = await Promise.all([
          tx.user.findUniqueOrThrow({ where: { id: buyerId }, select: { username: true } }),
          tx.crackedAccountLink.findFirst({
            where: { userId: recipient.id, serverId: item.store.serverId, status: "ACTIVE" },
            select: { minecraftUsername: true },
          }),
          tx.minecraftIdentity.findFirst({
            where: { userId: recipient.id, verified: true },
            select: { lastKnownUsername: true },
          }),
          tx.sparksLedgerEntry.groupBy({
            by: ["direction"],
            where: { userId: buyerId },
            _sum: { amount: true },
          }),
        ]);
        const minecraftUsername =
          crackedIdentity?.minecraftUsername ?? premiumIdentity?.lastKnownUsername;
        if (!minecraftUsername) throw new Error("The recipient cannot receive this server item.");
        const totalPrice = item.sparksPrice * input.quantity;
        const ownerProceedsCents = calculateOwnerProceedsCents(
          totalPrice,
          this.proceedsCentsPerThousandSparks,
        );
        if (availableSparks(balanceRows) < totalPrice) throw new Error("Not enough Sparks.");
        if (item.stockQuantity !== null) {
          const stock = await tx.serverStoreItem.updateMany({
            where: { id: item.id, stockQuantity: { gte: input.quantity } },
            data: { stockQuantity: { decrement: input.quantity } },
          });
          if (stock.count !== 1) throw new Error("The requested server store quantity is no longer available.");
        }
        const purchaseId = crypto.randomUUID();
        const commands = renderServerStoreCommands(item.commandTemplates, {
          player: minecraftUsername,
          quantity: input.quantity,
          purchaseId,
          itemId: item.id,
          buyer: buyer.username,
          recipient: recipient.username,
        });
        const debit = await tx.sparksLedgerEntry.create({
          data: {
            userId: buyerId,
            direction: "DEBIT",
            amount: totalPrice,
            transactionType: "SERVER_STORE_PURCHASE",
            referenceType: "SERVER_STORE_PURCHASE",
            referenceId: purchaseId,
            idempotencyKey: `server-store-purchase:${input.idempotencyKey}`,
          },
          select: { id: true },
        });
        const purchase = await tx.serverStorePurchase.create({
          data: {
            id: purchaseId,
            buyerId,
            recipientId: recipient.id,
            itemId: item.id,
            quantity: input.quantity,
            priceSparks: totalPrice,
            ownerProceedsCents,
            recipientMinecraftUsername: minecraftUsername,
            giftMessage: input.giftMessage,
            commandSnapshot: commands,
            idempotencyKey: input.idempotencyKey,
            sparksDebitLedgerEntryId: debit.id,
            refundEligibleUntil: new Date(Date.now() + 14 * 86_400_000),
          },
          select: purchaseSelect,
        });
        await Promise.all([
          tx.auditLog.create({
            data: {
              actorId: buyerId,
              action: "server_store_purchase.created",
              entityType: "ServerStorePurchase",
              entityId: purchase.id,
              requestId,
              afterSnapshot: {
                itemId: item.id,
                serverId: item.store.serverId,
                recipientId: recipient.id,
                quantity: input.quantity,
                priceSparks: totalPrice,
              },
            },
          }),
          createNotification(tx, {
            recipientId: buyerId,
            category: "SPARKS",
            title: `${item.name} purchased`,
            body: `${totalPrice.toLocaleString()} Sparks were used. Redeem the item from your Sparks Shop purchases when you are ready.`,
            actionUrl: "/dashboard/sparks-shop",
            dedupeKey: `server-store-purchase-buyer:${purchase.id}`,
          }),
          ...(recipient.id !== buyerId
            ? [
                createNotification(tx, {
                  recipientId: recipient.id,
                  category: "SPARKS" as const,
                  title: `${buyer.username} sent you ${item.name}`,
                  body: `Redeem your gift from the Sparks Shop when you are ready to receive it on ${item.store.server.name}.`,
                  actionUrl: "/dashboard/sparks-shop",
                  dedupeKey: `server-store-purchase-recipient:${purchase.id}`,
                }),
              ]
            : []),
        ]);
        return purchase;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async redeem(
    actorId: string,
    purchaseId: string,
    input: ServerStorePurchaseMutation,
    requestId: string,
  ) {
    return prisma.$transaction(
      async (tx) => {
        const purchase = await tx.serverStorePurchase.findUnique({
          where: { id: purchaseId },
          select: {
            id: true,
            recipientId: true,
            recipientMinecraftUsername: true,
            status: true,
            item: { select: { store: { select: { serverId: true } } } },
          },
        });
        if (!purchase || purchase.recipientId !== actorId) {
          throw new Error("Server store purchase not found.");
        }
        if (purchase.status === "DELIVERED" || purchase.status === "PENDING_DELIVERY") {
          return tx.serverStorePurchase.findUniqueOrThrow({
            where: { id: purchase.id },
            select: purchaseSelect,
          });
        }
        if (purchase.status !== "PURCHASED") {
          throw new Error("This server store purchase can no longer be redeemed.");
        }
        const [crackedIdentity, premiumIdentity] = await Promise.all([
          tx.crackedAccountLink.findFirst({
            where: {
              userId: actorId,
              serverId: purchase.item.store.serverId,
              status: "ACTIVE",
              minecraftUsername: {
                equals: purchase.recipientMinecraftUsername,
                mode: "insensitive",
              },
            },
            select: { id: true },
          }),
          tx.minecraftIdentity.findFirst({
            where: {
              userId: actorId,
              verified: true,
              lastKnownUsername: {
                equals: purchase.recipientMinecraftUsername,
                mode: "insensitive",
              },
            },
            select: { id: true },
          }),
        ]);
        if (!crackedIdentity && !premiumIdentity) {
          throw new Error(
            "The linked Minecraft identity for this server store purchase is no longer active.",
          );
        }
        const changed = await tx.serverStorePurchase.updateMany({
          where: { id: purchase.id, recipientId: actorId, status: "PURCHASED" },
          data: { status: "PENDING_DELIVERY", redeemedAt: new Date() },
        });
        if (changed.count !== 1) throw new Error("This server store purchase changed. Try again.");
        await Promise.all([
          tx.serverStoreDelivery.create({
            data: { purchaseId: purchase.id, serverId: purchase.item.store.serverId },
          }),
          tx.auditLog.create({
            data: {
              actorId,
              action: "server_store_purchase.redeemed",
              entityType: "ServerStorePurchase",
              entityId: purchase.id,
              requestId,
              afterSnapshot: {
                serverId: purchase.item.store.serverId,
                idempotencyKey: input.idempotencyKey,
                status: "PENDING_DELIVERY",
              },
            },
          }),
        ]);
        return tx.serverStorePurchase.findUniqueOrThrow({
          where: { id: purchase.id },
          select: purchaseSelect,
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async refund(
    actorId: string,
    purchaseId: string,
    input: ServerStorePurchaseMutation,
    requestId: string,
  ) {
    return prisma.$transaction(
      async (tx) => {
        const purchase = await tx.serverStorePurchase.findUnique({
          where: { id: purchaseId },
          select: {
            id: true,
            buyerId: true,
            recipientId: true,
            status: true,
            quantity: true,
            priceSparks: true,
            refundEligibleUntil: true,
            sparksRefundLedgerEntryId: true,
            item: {
              select: {
                id: true,
                name: true,
                stockQuantity: true,
                store: { select: { server: { select: { name: true } } } },
              },
            },
          },
        });
        if (!purchase || purchase.buyerId !== actorId) {
          throw new Error("Server store purchase not found.");
        }
        if (purchase.status === "REFUNDED") {
          return tx.serverStorePurchase.findUniqueOrThrow({
            where: { id: purchase.id },
            select: purchaseSelect,
          });
        }
        if (purchase.buyerId !== purchase.recipientId) {
          throw new Error("Gift purchases cannot be refunded.");
        }
        if (purchase.status !== "PURCHASED") {
          throw new Error("Redeemed server items cannot be refunded.");
        }
        if (purchase.refundEligibleUntil < new Date()) {
          throw new Error("The 14-day server item refund window has ended.");
        }
        const changed = await tx.serverStorePurchase.updateMany({
          where: { id: purchase.id, buyerId: actorId, status: "PURCHASED" },
          data: { status: "REFUNDED", refundedAt: new Date() },
        });
        if (changed.count !== 1) throw new Error("This server store purchase changed. Try again.");
        const refund = await tx.sparksLedgerEntry.create({
          data: {
            userId: actorId,
            direction: "CREDIT",
            amount: purchase.priceSparks,
            transactionType: "SERVER_STORE_PURCHASE_REFUND",
            referenceType: "SERVER_STORE_PURCHASE",
            referenceId: purchase.id,
            idempotencyKey: `server-store-player-refund:${purchase.id}`,
            internalNote: "Player refund before redemption within the 14-day window.",
          },
          select: { id: true },
        });
        await Promise.all([
          tx.serverStorePurchase.update({
            where: { id: purchase.id },
            data: { sparksRefundLedgerEntryId: refund.id },
          }),
          ...(purchase.item.stockQuantity !== null
            ? [
                tx.serverStoreItem.update({
                  where: { id: purchase.item.id },
                  data: { stockQuantity: { increment: purchase.quantity } },
                }),
              ]
            : []),
          tx.auditLog.create({
            data: {
              actorId,
              action: "server_store_purchase.refunded_before_redemption",
              entityType: "ServerStorePurchase",
              entityId: purchase.id,
              requestId,
              reason: "Player exercised the pre-redemption refund option.",
              afterSnapshot: {
                sparksReturned: purchase.priceSparks,
                idempotencyKey: input.idempotencyKey,
              },
            },
          }),
          createNotification(tx, {
            recipientId: actorId,
            category: "SPARKS",
            title: `${purchase.item.name} refunded`,
            body: `${purchase.priceSparks.toLocaleString()} Sparks were returned.`,
            actionUrl: "/dashboard/sparks-shop",
            dedupeKey: `server-store-player-refund:${purchase.id}`,
          }),
        ]);
        return tx.serverStorePurchase.findUniqueOrThrow({
          where: { id: purchase.id },
          select: purchaseSelect,
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async claimNextDelivery(serverId: string) {
    return prisma.$transaction(
      async (tx) => {
        const stale = new Date(Date.now() - 30_000);
        const delivery = await tx.serverStoreDelivery.findFirst({
          where: {
            serverId,
            OR: [
              { status: "PENDING" },
              { status: "CLAIMED", claimedAt: { lt: stale } },
            ],
          },
          select: {
            id: true,
            status: true,
            purchaseId: true,
            purchase: { select: { commandSnapshot: true } },
          },
          orderBy: { createdAt: "asc" },
        });
        if (!delivery) return null;
        const claimed = await tx.serverStoreDelivery.updateMany({
          where: {
            id: delivery.id,
            OR: [
              { status: "PENDING" },
              { status: "CLAIMED", claimedAt: { lt: stale } },
            ],
          },
          data: { status: "CLAIMED", claimedAt: new Date(), attemptCount: { increment: 1 } },
        });
        if (claimed.count !== 1) return null;
        return {
          id: delivery.id,
          purchaseId: delivery.purchaseId,
          commands: delivery.purchase.commandSnapshot,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async completeDelivery(
    serverId: string,
    deliveryId: string,
    success: boolean,
    error: string | undefined,
    requestId: string,
  ) {
    return prisma.$transaction(
      async (tx) => {
        const delivery = await tx.serverStoreDelivery.findFirst({
          where: { id: deliveryId, serverId },
          select: {
            id: true,
            status: true,
            purchaseId: true,
            purchase: {
              select: {
                buyerId: true,
                recipientId: true,
                quantity: true,
                priceSparks: true,
                ownerProceedsCents: true,
                createdAt: true,
                sparksRefundLedgerEntryId: true,
                item: {
                  select: {
                    id: true,
                    name: true,
                    stockQuantity: true,
                    store: {
                      select: {
                        id: true,
                        server: { select: { name: true, ownerId: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        });
        if (!delivery) throw new Error("Server store delivery not found.");
        if (delivery.status === "DELIVERED") return { accepted: true, status: "DELIVERED" };
        if (delivery.status === "FAILED") return { accepted: true, status: "REFUNDED" };
        if (delivery.status !== "CLAIMED") {
          throw new Error("Server store delivery is not currently claimed.");
        }
        const now = new Date();
        if (success) {
          const proceedsAvailableAt = new Date(
            delivery.purchase.createdAt.getTime() + 7 * 86_400_000,
          );
          await Promise.all([
            tx.serverStoreDelivery.update({
              where: { id: delivery.id },
              data: { status: "DELIVERED", completedAt: now, lastError: null },
            }),
            tx.serverStorePurchase.update({
              where: { id: delivery.purchaseId },
              data: { status: "DELIVERED", deliveredAt: now },
            }),
            createNotification(tx, {
              recipientId: delivery.purchase.recipientId,
              category: "SPARKS",
              title: `${delivery.purchase.item.name} delivered`,
              body: `The item was delivered on ${delivery.purchase.item.store.server.name}.`,
              actionUrl: "/dashboard/sparks-shop",
              dedupeKey: `server-store-delivered:${delivery.purchaseId}`,
            }),
            tx.auditLog.create({
              data: {
                action: "server_store_delivery.completed",
                entityType: "ServerStoreDelivery",
                entityId: delivery.id,
                requestId,
                afterSnapshot: { serverId, purchaseId: delivery.purchaseId },
              },
            }),
            ...(delivery.purchase.ownerProceedsCents > 0
              ? [
                  tx.serverStoreProceedsEntry.create({
                    data: {
                      ownerId: delivery.purchase.item.store.server.ownerId,
                      storeId: delivery.purchase.item.store.id,
                      purchaseId: delivery.purchaseId,
                      direction: "CREDIT" as const,
                      amountCents: delivery.purchase.ownerProceedsCents,
                      currency: "USD",
                      type: "DELIVERY_CREDIT" as const,
                      availableAt: proceedsAvailableAt,
                      idempotencyKey: `server-store-delivery-credit:${delivery.purchaseId}`,
                    },
                  }),
                ]
              : []),
          ]);
          return { accepted: true, status: "DELIVERED" };
        }
        let refundId = delivery.purchase.sparksRefundLedgerEntryId;
        if (!refundId) {
          const refund = await tx.sparksLedgerEntry.create({
            data: {
              userId: delivery.purchase.buyerId,
              direction: "CREDIT",
              amount: delivery.purchase.priceSparks,
              transactionType: "SERVER_STORE_PURCHASE_REFUND",
              referenceType: "SERVER_STORE_PURCHASE",
              referenceId: delivery.purchaseId,
              idempotencyKey: `server-store-refund:${delivery.purchaseId}`,
              internalNote: "Automatic refund after plugin command delivery failure.",
            },
            select: { id: true },
          });
          refundId = refund.id;
          if (delivery.purchase.item.stockQuantity !== null) {
            await tx.serverStoreItem.update({
              where: { id: delivery.purchase.item.id },
              data: { stockQuantity: { increment: delivery.purchase.quantity } },
            });
          }
        }
        await Promise.all([
          tx.serverStoreDelivery.update({
            where: { id: delivery.id },
            data: { status: "FAILED", completedAt: now, lastError: error },
          }),
          tx.serverStorePurchase.update({
            where: { id: delivery.purchaseId },
            data: {
              status: "REFUNDED",
              failedAt: now,
              refundedAt: now,
              sparksRefundLedgerEntryId: refundId,
            },
          }),
          createNotification(tx, {
            recipientId: delivery.purchase.buyerId,
            category: "SPARKS",
            title: `${delivery.purchase.item.name} delivery failed`,
            body: `${delivery.purchase.priceSparks.toLocaleString()} Sparks were automatically returned.`,
            actionUrl: "/dashboard/sparks-shop",
            dedupeKey: `server-store-refunded:${delivery.purchaseId}`,
          }),
          tx.auditLog.create({
            data: {
              action: "server_store_delivery.failed_and_refunded",
              entityType: "ServerStoreDelivery",
              entityId: delivery.id,
              requestId,
              afterSnapshot: { serverId, purchaseId: delivery.purchaseId, refunded: true },
              reason: error,
            },
          }),
        ]);
        return { accepted: true, status: "REFUNDED" };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }
}
