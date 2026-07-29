import { randomUUID } from "node:crypto";
import { prisma, Prisma } from "@nortix/database";
import {
  HYPE_BUNDLE_AMOUNT,
  HYPE_BUNDLE_SPARKS,
  HYPE_DAILY_PURCHASE_LIMIT,
  HYPE_MONTHLY_CARRY_PERCENT,
  effectiveHypeScore,
  hypeMilestoneFor,
  nextHypeMilestoneFor,
  utcDayStart,
  utcMonthStart,
} from "./policy.js";

const sparksBalance = (
  rows: Array<{ direction: "CREDIT" | "DEBIT"; _sum: { amount: number | null } }>,
) =>
  rows.reduce(
    (total, row) =>
      total + (row.direction === "CREDIT" ? row._sum.amount ?? 0 : -(row._sum.amount ?? 0)),
    0,
  );

const publicHype = (score: number, periodStart: Date, now = new Date()) => {
  const hype = effectiveHypeScore(score, periodStart, now);
  return {
    total: hype,
    periodStart: utcMonthStart(now).toISOString(),
    carryPercent: HYPE_MONTHLY_CARRY_PERCENT,
    milestone: hypeMilestoneFor(hype),
    nextMilestone: nextHypeMilestoneFor(hype),
  };
};

export class HypeService {
  present(score: number, periodStart: Date, now = new Date()) {
    return publicHype(score, periodStart, now);
  }

  async eligibility(userId: string, serverId: string, now = new Date()) {
    const dayStart = utcDayStart(now);
    const [server, playedBefore, purchasesToday, balanceRows] = await Promise.all([
      prisma.server.findFirst({
        where: { id: serverId, publicListing: true, moderationStatus: "APPROVED" },
        select: { id: true, hypeScore: true, hypePeriodStart: true },
      }),
      prisma.playerGameplayDailyStat.count({
        where: { userId, serverId, joins: { gt: 0 } },
      }),
      prisma.hypePurchase.count({
        where: { userId, serverId, purchaseDate: dayStart },
      }),
      prisma.sparksLedgerEntry.groupBy({
        by: ["direction"],
        where: { userId },
        _sum: { amount: true },
      }),
    ]);
    if (!server) throw new Error("Server not found.");
    const balance = sparksBalance(balanceRows);
    return {
      ...publicHype(server.hypeScore, server.hypePeriodStart, now),
      playedBefore: playedBefore > 0,
      purchasesToday,
      purchasesRemaining: Math.max(0, HYPE_DAILY_PURCHASE_LIMIT - purchasesToday),
      sparksBalance: balance,
      canPurchase:
        playedBefore > 0 &&
        purchasesToday < HYPE_DAILY_PURCHASE_LIMIT &&
        balance >= HYPE_BUNDLE_SPARKS,
      bundle: { sparks: HYPE_BUNDLE_SPARKS, hype: HYPE_BUNDLE_AMOUNT },
      dailyPurchaseLimit: HYPE_DAILY_PURCHASE_LIMIT,
    };
  }

  async purchase(
    userId: string,
    serverId: string,
    idempotencyKey: string,
    requestId: string,
    now = new Date(),
  ) {
    return prisma.$transaction(
      async (tx) => {
        const replay = await tx.hypePurchase.findUnique({
          where: { idempotencyKey },
          select: { id: true, userId: true, serverId: true },
        });
        if (replay) {
          if (replay.userId !== userId || replay.serverId !== serverId) {
            throw new Error("This Hype purchase request has already been used.");
          }
          const state = await this.eligibility(userId, serverId, now);
          return { purchaseId: replay.id, replayed: true, ...state };
        }

        await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
        await tx.$queryRaw`SELECT "id" FROM "Server" WHERE "id" = ${serverId} FOR UPDATE`;
        const server = await tx.server.findFirst({
          where: { id: serverId, publicListing: true, moderationStatus: "APPROVED" },
          select: { id: true, name: true, hypeScore: true, hypePeriodStart: true },
        });
        if (!server) throw new Error("Server not found.");

        const playedBefore = await tx.playerGameplayDailyStat.count({
          where: { userId, serverId, joins: { gt: 0 } },
        });
        if (playedBefore === 0) {
          throw new Error("Play this server through Nortix before adding Hype.");
        }

        const dayStart = utcDayStart(now);
        const purchasesToday = await tx.hypePurchase.count({
          where: { userId, serverId, purchaseDate: dayStart },
        });
        if (purchasesToday >= HYPE_DAILY_PURCHASE_LIMIT) {
          throw new Error("You have reached today's Hype limit for this server.");
        }

        const balanceRows = await tx.sparksLedgerEntry.groupBy({
          by: ["direction"],
          where: { userId },
          _sum: { amount: true },
        });
        const previousBalance = sparksBalance(balanceRows);
        if (previousBalance < HYPE_BUNDLE_SPARKS) throw new Error("Not enough Sparks.");

        const periodStart = utcMonthStart(now);
        const previousHype = effectiveHypeScore(
          server.hypeScore,
          server.hypePeriodStart,
          now,
        );
        const nextHype = previousHype + HYPE_BUNDLE_AMOUNT;
        const purchaseId = randomUUID();
        const ledger = await tx.sparksLedgerEntry.create({
          data: {
            userId,
            direction: "DEBIT",
            amount: HYPE_BUNDLE_SPARKS,
            transactionType: "HYPE_PURCHASE",
            referenceType: "SERVER_HYPE",
            referenceId: purchaseId,
            idempotencyKey: `hype:${idempotencyKey}`,
            internalNote: "Non-refundable server Hype purchase.",
          },
          select: { id: true },
        });
        await tx.hypePurchase.create({
          data: {
            id: purchaseId,
            userId,
            serverId,
            hypeAmount: HYPE_BUNDLE_AMOUNT,
            sparksCost: HYPE_BUNDLE_SPARKS,
            periodStart,
            purchaseDate: dayStart,
            idempotencyKey,
            ledgerEntryId: ledger.id,
          },
        });
        const balance = previousBalance - HYPE_BUNDLE_SPARKS;
        await Promise.all([
          tx.server.update({
            where: { id: serverId },
            data: { hypeScore: nextHype, hypePeriodStart: periodStart },
          }),
          tx.user.update({
            where: { id: userId },
            data: { sparksBalanceCache: balance },
          }),
          tx.auditLog.create({
            data: {
              actorId: userId,
              action: "hype.purchase",
              entityType: "Server",
              entityId: serverId,
              requestId,
              reason: "Player added Hype after a backend-verified server join.",
              beforeSnapshot: { hype: previousHype, sparksBalance: previousBalance },
              afterSnapshot: {
                hype: nextHype,
                sparksBalance: balance,
                hypeAdded: HYPE_BUNDLE_AMOUNT,
                sparksRemoved: HYPE_BUNDLE_SPARKS,
                purchaseId,
              },
            },
          }),
        ]);
        return {
          purchaseId,
          replayed: false,
          ...publicHype(nextHype, periodStart, now),
          playedBefore: true,
          purchasesToday: purchasesToday + 1,
          purchasesRemaining: HYPE_DAILY_PURCHASE_LIMIT - purchasesToday - 1,
          sparksBalance: balance,
          canPurchase:
            purchasesToday + 1 < HYPE_DAILY_PURCHASE_LIMIT &&
            balance >= HYPE_BUNDLE_SPARKS,
          bundle: { sparks: HYPE_BUNDLE_SPARKS, hype: HYPE_BUNDLE_AMOUNT },
          dailyPurchaseLimit: HYPE_DAILY_PURCHASE_LIMIT,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }
}
