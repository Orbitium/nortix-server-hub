import { randomUUID } from "node:crypto";
import { prisma, Prisma } from "@nortix/database";
import type { ServerAwardKind } from "@nortix/shared";
import {
  SERVER_AWARD_CATALOG,
  SERVER_AWARD_DAILY_LIMIT,
  serverAwardFor,
} from "./policy.js";
import { utcDayStart } from "../hype/policy.js";

const balanceFromRows = (
  rows: Array<{ direction: "CREDIT" | "DEBIT"; _sum: { amount: number | null } }>,
) =>
  rows.reduce(
    (total, row) =>
      total + (row.direction === "CREDIT" ? row._sum.amount ?? 0 : -(row._sum.amount ?? 0)),
    0,
  );

const profileIsPublic = (profile: unknown) =>
  !profile ||
  typeof profile !== "object" ||
  !("isPublic" in profile) ||
  (profile as { isPublic?: unknown }).isPublic !== false;

export class ServerAwardService {
  async summary(serverId: string) {
    const [counts, visiblePurchases] = await Promise.all([
      prisma.serverAwardPurchase.groupBy({
        by: ["kind"],
        where: { serverId },
        _count: { _all: true },
      }),
      prisma.serverAwardPurchase.findMany({
        where: { serverId, showGiver: true },
        select: {
          kind: true,
          user: {
            select: {
              username: true,
              displayName: true,
              avatarUrl: true,
              publicProfile: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 250,
      }),
    ]);
    const countsByKind = new Map(counts.map((row) => [row.kind, row._count._all]));
    const giversByKind = new Map<
      ServerAwardKind,
      Map<string, { username: string; displayName: string; avatarUrl: string | null }>
    >();
    for (const purchase of visiblePurchases) {
      if (!profileIsPublic(purchase.user.publicProfile)) continue;
      const givers = giversByKind.get(purchase.kind) ?? new Map();
      givers.set(purchase.user.username, {
        username: purchase.user.username,
        displayName: purchase.user.displayName,
        avatarUrl: purchase.user.avatarUrl,
      });
      giversByKind.set(purchase.kind, givers);
    }
    const awards = SERVER_AWARD_CATALOG.map((award) => ({
      ...award,
      count: countsByKind.get(award.kind) ?? 0,
      givers: [...(giversByKind.get(award.kind)?.values() ?? [])].slice(0, 12),
    }));
    return {
      total: awards.reduce((sum, award) => sum + award.count, 0),
      awards,
    };
  }

  async eligibility(userId: string, serverId: string, now = new Date()) {
    const purchaseDate = utcDayStart(now);
    const [server, playedBefore, purchasesToday, balanceRows] = await Promise.all([
      prisma.server.findFirst({
        where: { id: serverId, publicListing: true, moderationStatus: "APPROVED" },
        select: { id: true },
      }),
      prisma.playerGameplayDailyStat.count({
        where: { userId, serverId, joins: { gt: 0 } },
      }),
      prisma.serverAwardPurchase.count({
        where: { userId, serverId, purchaseDate },
      }),
      prisma.sparksLedgerEntry.groupBy({
        by: ["direction"],
        where: { userId },
        _sum: { amount: true },
      }),
    ]);
    if (!server) throw new Error("Server not found.");
    return {
      playedBefore: playedBefore > 0,
      purchasesToday,
      purchasesRemaining: Math.max(0, SERVER_AWARD_DAILY_LIMIT - purchasesToday),
      dailyPurchaseLimit: SERVER_AWARD_DAILY_LIMIT,
      sparksBalance: balanceFromRows(balanceRows),
    };
  }

  async purchase(input: {
    userId: string;
    serverId: string;
    kind: ServerAwardKind;
    showGiver: boolean;
    idempotencyKey: string;
    requestId: string;
    now?: Date;
  }) {
    const award = serverAwardFor(input.kind);
    if (!award) throw new Error("Award not found.");
    const now = input.now ?? new Date();
    return prisma.$transaction(
      async (tx) => {
        const replay = await tx.serverAwardPurchase.findUnique({
          where: { idempotencyKey: input.idempotencyKey },
          select: {
            id: true,
            userId: true,
            serverId: true,
            kind: true,
            sparksCost: true,
            showGiver: true,
          },
        });
        if (replay) {
          if (
            replay.userId !== input.userId ||
            replay.serverId !== input.serverId ||
            replay.kind !== input.kind ||
            replay.showGiver !== input.showGiver
          ) {
            throw new Error("This award purchase request has already been used.");
          }
          return { purchaseId: replay.id, kind: replay.kind, cost: replay.sparksCost, replayed: true };
        }

        await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${input.userId} FOR UPDATE`;
        await tx.$queryRaw`SELECT "id" FROM "Server" WHERE "id" = ${input.serverId} FOR UPDATE`;
        const server = await tx.server.findFirst({
          where: {
            id: input.serverId,
            publicListing: true,
            moderationStatus: "APPROVED",
          },
          select: { id: true },
        });
        if (!server) throw new Error("Server not found.");

        const playedBefore = await tx.playerGameplayDailyStat.count({
          where: { userId: input.userId, serverId: input.serverId, joins: { gt: 0 } },
        });
        if (playedBefore === 0) {
          throw new Error("Play this server through Nortix before giving it an award.");
        }

        const purchaseDate = utcDayStart(now);
        const purchasesToday = await tx.serverAwardPurchase.count({
          where: { userId: input.userId, serverId: input.serverId, purchaseDate },
        });
        if (purchasesToday >= SERVER_AWARD_DAILY_LIMIT) {
          throw new Error("You have reached today's award limit for this server.");
        }

        const balanceRows = await tx.sparksLedgerEntry.groupBy({
          by: ["direction"],
          where: { userId: input.userId },
          _sum: { amount: true },
        });
        const previousBalance = balanceFromRows(balanceRows);
        if (previousBalance < award.cost) throw new Error("Not enough Sparks.");

        const purchaseId = randomUUID();
        const ledger = await tx.sparksLedgerEntry.create({
          data: {
            userId: input.userId,
            direction: "DEBIT",
            amount: award.cost,
            transactionType: "SERVER_AWARD_PURCHASE",
            referenceType: "SERVER_AWARD",
            referenceId: purchaseId,
            idempotencyKey: `server-award:${input.idempotencyKey}`,
            internalNote: `Permanent ${award.name} server award.`,
          },
          select: { id: true },
        });
        await tx.serverAwardPurchase.create({
          data: {
            id: purchaseId,
            userId: input.userId,
            serverId: input.serverId,
            kind: award.kind,
            sparksCost: award.cost,
            showGiver: input.showGiver,
            purchaseDate,
            idempotencyKey: input.idempotencyKey,
            ledgerEntryId: ledger.id,
          },
        });
        const balance = previousBalance - award.cost;
        await Promise.all([
          tx.user.update({
            where: { id: input.userId },
            data: { sparksBalanceCache: balance },
          }),
          tx.auditLog.create({
            data: {
              actorId: input.userId,
              action: "server_award.purchase",
              entityType: "Server",
              entityId: input.serverId,
              requestId: input.requestId,
              reason: `Player gave the permanent ${award.name} award.`,
              beforeSnapshot: { sparksBalance: previousBalance },
              afterSnapshot: {
                sparksBalance: balance,
                awardKind: award.kind,
                sparksRemoved: award.cost,
                purchaseId,
              },
            },
          }),
        ]);
        return { purchaseId, kind: award.kind, cost: award.cost, replayed: false };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }
}
