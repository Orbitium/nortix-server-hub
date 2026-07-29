import { prisma, Prisma } from "@nortix/database";
import type {
  AdminSponsoredItemInput,
  AdminSponsoredItemUpdate,
  AdminSponsoredPurchaseAction,
  AdminSponsoredStoreInput,
  AdminSponsoredStoreUpdate,
  SponsoredPurchaseInput,
} from "@nortix/shared";
import { createNotification } from "../notifications/service.js";
import {
  canTransitionSponsoredPurchase,
  sponsoredPurchaseStatusAfter,
} from "./policy.js";

const playerPurchaseSelect = {
  id: true,
  status: true,
  priceSparks: true,
  fulfillmentDetails: true,
  deliveryReference: true,
  statusReason: true,
  processingAt: true,
  deliveredAt: true,
  cancelledAt: true,
  refundedAt: true,
  createdAt: true,
  updatedAt: true,
  item: {
    select: {
      id: true,
      name: true,
      description: true,
      imageUrl: true,
      fulfillmentSummary: true,
      store: { select: { id: true, slug: true, name: true, websiteUrl: true } },
    },
  },
} as const;

const adminPurchaseSelect = {
  ...playerPurchaseSelect,
  adminNote: true,
  user: { select: { id: true, username: true, displayName: true } },
  handledBy: { select: { id: true, username: true, displayName: true } },
  sparksDebitLedgerEntryId: true,
  sparksRefundLedgerEntryId: true,
} as const;

const fulfillmentKey = {
  MINECRAFT_USERNAME: "minecraftUsername",
  DISCORD_USERNAME: "discordUsername",
  EMAIL: "email",
} as const;

const safeCatalogSelect = {
  id: true,
  slug: true,
  name: true,
  description: true,
  websiteUrl: true,
  logoUrl: true,
  items: {
    where: { available: true },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      sparksPrice: true,
      imageUrl: true,
      fulfillmentSummary: true,
      fulfillmentFields: true,
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  },
} satisfies Prisma.SponsoredStoreSelect;

const availableSparks = (
  rows: Array<{ direction: "CREDIT" | "DEBIT"; _sum: { amount: number | null } }>,
) =>
  rows.reduce(
    (total, row) =>
      total + (row.direction === "CREDIT" ? (row._sum.amount ?? 0) : -(row._sum.amount ?? 0)),
    0,
  );

export class SponsoredShopService {
  async catalog() {
    return prisma.sponsoredStore.findMany({
      where: { available: true, items: { some: { available: true } } },
      select: safeCatalogSelect,
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
  }

  async listMine(userId: string) {
    return prisma.sponsoredPurchase.findMany({
      where: { userId },
      select: playerPurchaseSelect,
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  async purchase(userId: string, input: SponsoredPurchaseInput, requestId: string) {
    return prisma.$transaction(
      async (tx) => {
        const previous = await tx.sponsoredPurchase.findUnique({
          where: { idempotencyKey: input.idempotencyKey },
          select: { userId: true, ...playerPurchaseSelect },
        });
        if (previous) {
          if (previous.userId !== userId) throw new Error("Purchase request could not be completed.");
          const { userId: _userId, ...purchase } = previous;
          return purchase;
        }
        const [item, balanceRows] = await Promise.all([
          tx.sponsoredItem.findFirst({
            where: { id: input.itemId, available: true, store: { available: true } },
            select: {
              id: true,
              name: true,
              sparksPrice: true,
              fulfillmentFields: true,
              store: { select: { name: true } },
            },
          }),
          tx.sparksLedgerEntry.groupBy({
            by: ["direction"],
            where: { userId },
            _sum: { amount: true },
          }),
        ]);
        if (!item) throw new Error("Sponsored item not found.");
        const details = input.fulfillmentDetails;
        for (const field of item.fulfillmentFields) {
          if (!details[fulfillmentKey[field]]) {
            throw new Error("Required delivery details are missing.");
          }
        }
        const safeDetails = Object.fromEntries(
          item.fulfillmentFields.map((field) => {
            const key = fulfillmentKey[field];
            return [key, details[key]];
          }),
        );
        if (availableSparks(balanceRows) < item.sparksPrice) throw new Error("Not enough Sparks.");
        const debit = await tx.sparksLedgerEntry.create({
          data: {
            userId,
            direction: "DEBIT",
            amount: item.sparksPrice,
            transactionType: "SPONSORED_PURCHASE",
            referenceType: "SPONSORED_ITEM",
            referenceId: item.id,
            idempotencyKey: `sponsored-purchase:${input.idempotencyKey}`,
          },
          select: { id: true },
        });
        const purchase = await tx.sponsoredPurchase.create({
          data: {
            userId,
            itemId: item.id,
            priceSparks: item.sparksPrice,
            fulfillmentDetails: safeDetails,
            idempotencyKey: input.idempotencyKey,
            sparksDebitLedgerEntryId: debit.id,
          },
          select: playerPurchaseSelect,
        });
        await Promise.all([
          tx.auditLog.create({
            data: {
              actorId: userId,
              action: "sponsored_purchase.created",
              entityType: "SponsoredPurchase",
              entityId: purchase.id,
              requestId,
              afterSnapshot: {
                itemId: item.id,
                priceSparks: item.sparksPrice,
                status: "REQUESTED",
              },
            },
          }),
          createNotification(tx, {
            recipientId: userId,
            category: "SPARKS",
            title: `${item.name} request received`,
            body: `${item.sparksPrice.toLocaleString()} Sparks were used. Nortix staff will review the gift delivery request.`,
            actionUrl: "/dashboard/sparks-shop",
            dedupeKey: `sponsored-purchase:${purchase.id}`,
          }),
        ]);
        return purchase;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async adminCatalog() {
    return prisma.sponsoredStore.findMany({
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        websiteUrl: true,
        logoUrl: true,
        available: true,
        sortOrder: true,
        createdAt: true,
        updatedAt: true,
        createdBy: { select: { username: true, displayName: true } },
        items: {
          select: {
            id: true,
            slug: true,
            name: true,
            description: true,
            sparksPrice: true,
            imageUrl: true,
            fulfillmentSummary: true,
            fulfillmentFields: true,
            available: true,
            sortOrder: true,
            createdAt: true,
            updatedAt: true,
            _count: { select: { purchases: true } },
          },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        },
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
  }

  async createStore(adminId: string, input: AdminSponsoredStoreInput, requestId: string) {
    return prisma.$transaction(async (tx) => {
      const store = await tx.sponsoredStore.create({
        data: { ...input, createdById: adminId },
      });
      await tx.auditLog.create({
        data: {
          actorId: adminId,
          action: "sponsored_store.created",
          entityType: "SponsoredStore",
          entityId: store.id,
          requestId,
          afterSnapshot: { slug: store.slug, name: store.name, available: store.available },
        },
      });
      return store;
    });
  }

  async updateStore(
    adminId: string,
    storeId: string,
    input: AdminSponsoredStoreUpdate,
    requestId: string,
  ) {
    return prisma.$transaction(async (tx) => {
      const before = await tx.sponsoredStore.findUniqueOrThrow({ where: { id: storeId } });
      const updated = await tx.sponsoredStore.update({ where: { id: storeId }, data: input });
      await tx.auditLog.create({
        data: {
          actorId: adminId,
          action: "sponsored_store.updated",
          entityType: "SponsoredStore",
          entityId: storeId,
          requestId,
          beforeSnapshot: { name: before.name, available: before.available },
          afterSnapshot: { name: updated.name, available: updated.available },
        },
      });
      return updated;
    });
  }

  async createItem(
    adminId: string,
    storeId: string,
    input: AdminSponsoredItemInput,
    requestId: string,
  ) {
    return prisma.$transaction(async (tx) => {
      const store = await tx.sponsoredStore.findUnique({ where: { id: storeId }, select: { id: true } });
      if (!store) throw new Error("Sponsored store not found.");
      const item = await tx.sponsoredItem.create({ data: { ...input, storeId } });
      await tx.auditLog.create({
        data: {
          actorId: adminId,
          action: "sponsored_item.created",
          entityType: "SponsoredItem",
          entityId: item.id,
          requestId,
          afterSnapshot: {
            storeId,
            slug: item.slug,
            sparksPrice: item.sparksPrice,
            available: item.available,
          },
        },
      });
      return item;
    });
  }

  async updateItem(
    adminId: string,
    itemId: string,
    input: AdminSponsoredItemUpdate,
    requestId: string,
  ) {
    return prisma.$transaction(async (tx) => {
      const before = await tx.sponsoredItem.findUniqueOrThrow({ where: { id: itemId } });
      const updated = await tx.sponsoredItem.update({ where: { id: itemId }, data: input });
      await tx.auditLog.create({
        data: {
          actorId: adminId,
          action: "sponsored_item.updated",
          entityType: "SponsoredItem",
          entityId: itemId,
          requestId,
          beforeSnapshot: {
            name: before.name,
            sparksPrice: before.sparksPrice,
            available: before.available,
          },
          afterSnapshot: {
            name: updated.name,
            sparksPrice: updated.sparksPrice,
            available: updated.available,
          },
        },
      });
      return updated;
    });
  }

  async adminPurchases(status?: "REQUESTED" | "PROCESSING" | "DELIVERED" | "CANCELLED" | "REFUNDED") {
    return prisma.sponsoredPurchase.findMany({
      where: status ? { status } : undefined,
      select: adminPurchaseSelect,
      orderBy: [{ status: "asc" }, { createdAt: "asc" }],
      take: 250,
    });
  }

  async actOnPurchase(
    adminId: string,
    purchaseId: string,
    input: AdminSponsoredPurchaseAction,
    requestId: string,
  ) {
    return prisma.$transaction(
      async (tx) => {
        const purchase = await tx.sponsoredPurchase.findUnique({
          where: { id: purchaseId },
          select: {
            id: true,
            userId: true,
            status: true,
            priceSparks: true,
            sparksRefundLedgerEntryId: true,
            item: { select: { name: true } },
          },
        });
        if (!purchase) throw new Error("Sponsored purchase not found.");
        if (purchase.status === "REFUNDED" && ["REFUND", "CANCEL_AND_REFUND"].includes(input.action)) {
          return tx.sponsoredPurchase.findUniqueOrThrow({
            where: { id: purchase.id },
            select: adminPurchaseSelect,
          });
        }

        if (!canTransitionSponsoredPurchase(purchase.status, input.action)) {
          throw new Error(`Sponsored purchase cannot transition from ${purchase.status}.`);
        }

        const now = new Date();
        const isRefund = input.action === "REFUND" || input.action === "CANCEL_AND_REFUND";
        let refundLedgerEntryId = purchase.sparksRefundLedgerEntryId;
        if (isRefund && !refundLedgerEntryId) {
          const refund = await tx.sparksLedgerEntry.create({
            data: {
              userId: purchase.userId,
              direction: "CREDIT",
              amount: purchase.priceSparks,
              transactionType: "SPONSORED_PURCHASE_REFUND",
              referenceType: "SPONSORED_PURCHASE",
              referenceId: purchase.id,
              idempotencyKey: `sponsored-purchase-refund:${purchase.id}`,
              createdById: adminId,
              internalNote: input.reason,
            },
            select: { id: true },
          });
          refundLedgerEntryId = refund.id;
        }
        const nextStatus = sponsoredPurchaseStatusAfter(input.action);
        const updated = await tx.sponsoredPurchase.update({
          where: { id: purchase.id },
          data: {
            status: nextStatus,
            handledById: adminId,
            adminNote: input.adminNote,
            statusReason: input.reason,
            deliveryReference:
              input.action === "MARK_DELIVERED" ? input.deliveryReference : undefined,
            sparksRefundLedgerEntryId: refundLedgerEntryId,
            processingAt: input.action === "START_PROCESSING" ? now : undefined,
            deliveredAt: input.action === "MARK_DELIVERED" ? now : undefined,
            cancelledAt: ["CANCEL", "CANCEL_AND_REFUND"].includes(input.action) ? now : undefined,
            refundedAt: isRefund ? now : undefined,
          },
          select: adminPurchaseSelect,
        });
        await Promise.all([
          tx.auditLog.create({
            data: {
              actorId: adminId,
              action: `sponsored_purchase.${input.action.toLowerCase()}`,
              entityType: "SponsoredPurchase",
              entityId: purchase.id,
              requestId,
              beforeSnapshot: { status: purchase.status },
              afterSnapshot: {
                status: nextStatus,
                sparksRefunded: isRefund ? purchase.priceSparks : 0,
              },
              reason: input.reason,
            },
          }),
          createNotification(tx, {
            recipientId: purchase.userId,
            category: "SPARKS",
            title:
              nextStatus === "DELIVERED"
                ? `${purchase.item.name} gift delivered`
                : nextStatus === "REFUNDED"
                  ? `${purchase.item.name} Sparks refunded`
                  : nextStatus === "CANCELLED"
                    ? `${purchase.item.name} request cancelled`
                    : `${purchase.item.name} is being processed`,
            body:
              nextStatus === "DELIVERED"
                ? "Your private delivery details are available in the Sparks Shop."
                : nextStatus === "REFUNDED"
                  ? `${purchase.priceSparks.toLocaleString()} Sparks were returned to your account.`
                  : nextStatus === "CANCELLED"
                    ? "The request was cancelled. Open the Sparks Shop for its status."
                    : "Nortix staff started processing your gift request.",
            actionUrl: "/dashboard/sparks-shop",
            dedupeKey: `sponsored-purchase-status:${purchase.id}:${nextStatus}`,
          }),
        ]);
        return updated;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }
}
