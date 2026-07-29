import { prisma, Prisma } from "@nortix/database";
import type {
  OwnerServerStoreInput,
  OwnerServerStoreItemInput,
  OwnerServerStoreItemUpdate,
  ServerStorePurchaseInput,
} from "@nortix/shared";
import { createNotification } from "../notifications/service.js";
import { renderServerStoreCommands } from "./policy.js";

const availableSparks = (
  rows: Array<{ direction: "CREDIT" | "DEBIT"; _sum: { amount: number | null } }>,
) =>
  rows.reduce(
    (total, row) =>
      total + (row.direction === "CREDIT" ? (row._sum.amount ?? 0) : -(row._sum.amount ?? 0)),
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
    where: { available: true, OR: [{ stockQuantity: null }, { stockQuantity: { gt: 0 } }] },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
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
          some: { available: true, OR: [{ stockQuantity: null }, { stockQuantity: { gt: 0 } }] },
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
            sparksPrice: true,
            imageUrls: true,
            stockQuantity: true,
            maxPerPurchase: true,
            commandTemplates: true,
            available: true,
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
        select: { id: true, claimed: true, verificationStatus: true },
      });
      if (!server?.claimed || server.verificationStatus !== "VERIFIED") {
        throw new Error("Server verification is required before publishing a Sparks store.");
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
            sparksPrice: item.sparksPrice,
            stockQuantity: item.stockQuantity,
            commandCount: item.commandTemplates.length,
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
            stockQuantity: before.stockQuantity,
            available: before.available,
          },
          afterSnapshot: {
            sparksPrice: item.sparksPrice,
            stockQuantity: item.stockQuantity,
            available: item.available,
          },
        },
      });
      return item;
    });
  }

  ownerPurchases(serverId: string) {
    return prisma.serverStorePurchase.findMany({
      where: { item: { store: { serverId } } },
      select: ownerPurchaseSelect,
      orderBy: { createdAt: "desc" },
      take: 200,
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
            available: true,
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
                serverId: true,
                server: { select: { name: true, pluginCapabilities: true } },
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
            recipientMinecraftUsername: minecraftUsername,
            giftMessage: input.giftMessage,
            commandSnapshot: commands,
            idempotencyKey: input.idempotencyKey,
            sparksDebitLedgerEntryId: debit.id,
            delivery: { create: { serverId: item.store.serverId } },
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
            title: `${item.name} queued`,
            body: `${totalPrice.toLocaleString()} Sparks were used. Delivery is queued for ${minecraftUsername} on ${item.store.server.name}.`,
            actionUrl: "/dashboard/sparks-shop",
            dedupeKey: `server-store-purchase-buyer:${purchase.id}`,
          }),
          ...(recipient.id !== buyerId
            ? [
                createNotification(tx, {
                  recipientId: recipient.id,
                  category: "SPARKS" as const,
                  title: `${buyer.username} sent you ${item.name}`,
                  body: `Your gift is queued for ${minecraftUsername} on ${item.store.server.name}.`,
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
        await tx.serverStorePurchase.update({
          where: { id: delivery.purchaseId },
          data: { status: "PROCESSING" },
        });
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
