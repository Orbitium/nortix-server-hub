import { prisma, type Prisma } from "@nortix/database";
import type { AdminSparksAdjustmentInput } from "@nortix/shared";
import { createNotification } from "../notifications/service.js";
import { adjustedSparksBalance, sparksBalances } from "./policy.js";

const playerSelect = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  status: true,
  lastActiveAt: true,
} satisfies Prisma.UserSelect;

export class AdminSparksService {
  async dashboard(search = "") {
    const since = new Date(Date.now() - 29 * 86_400_000);
    since.setUTCHours(0, 0, 0, 0);

    const [
      activePlayers,
      ledgerGroups,
      creditTotal,
      debitTotal,
      spendGroups,
      ledgerEntryCount,
      recentEntries,
      trendEntries,
      matchingPlayers,
    ] = await Promise.all([
      prisma.user.count({ where: { status: "ACTIVE", roles: { has: "PLAYER" } } }),
      prisma.sparksLedgerEntry.groupBy({
        by: ["userId", "direction"],
        where: { user: { status: "ACTIVE", roles: { has: "PLAYER" } } },
        _sum: { amount: true },
      }),
      prisma.sparksLedgerEntry.aggregate({
        where: { direction: "CREDIT" },
        _sum: { amount: true },
      }),
      prisma.sparksLedgerEntry.aggregate({
        where: { direction: "DEBIT" },
        _sum: { amount: true },
      }),
      prisma.sparksLedgerEntry.groupBy({
        by: ["transactionType"],
        where: { direction: "DEBIT" },
        _sum: { amount: true },
        _count: { _all: true },
        orderBy: { _sum: { amount: "desc" } },
      }),
      prisma.sparksLedgerEntry.count(),
      prisma.sparksLedgerEntry.findMany({
        select: {
          id: true,
          direction: true,
          amount: true,
          transactionType: true,
          referenceType: true,
          internalNote: true,
          createdAt: true,
          user: { select: playerSelect },
          createdBy: {
            select: { id: true, username: true, displayName: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.sparksLedgerEntry.findMany({
        where: { createdAt: { gte: since } },
        select: { direction: true, amount: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.user.findMany({
        where: {
          roles: { has: "PLAYER" },
          ...(search
            ? {
                OR: [
                  { username: { contains: search, mode: "insensitive" } },
                  { displayName: { contains: search, mode: "insensitive" } },
                ],
              }
            : {}),
        },
        select: playerSelect,
        orderBy: { lastActiveAt: "desc" },
        take: 100,
      }),
    ]);

    const balances = sparksBalances(ledgerGroups);
    const rankedBalanceIds = [...balances.entries()]
      .filter(([, balance]) => balance > 0)
      .sort((left, right) => right[1] - left[1])
      .slice(0, 10)
      .map(([userId]) => userId);
    const spenderTotals = new Map<string, number>();
    for (const row of ledgerGroups) {
      if (row.direction === "DEBIT") {
        spenderTotals.set(row.userId, row._sum.amount ?? 0);
      }
    }
    const rankedSpenderIds = [...spenderTotals.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 10)
      .map(([userId]) => userId);
    const rankedIds = [...new Set([...rankedBalanceIds, ...rankedSpenderIds])];
    const rankedUsers = rankedIds.length
      ? await prisma.user.findMany({
          where: { id: { in: rankedIds } },
          select: playerSelect,
        })
      : [];
    const rankedUserById = new Map(rankedUsers.map((user) => [user.id, user]));

    const daily = new Map<string, { credited: number; spent: number; entries: number }>();
    for (let offset = 0; offset < 30; offset += 1) {
      const date = new Date(since);
      date.setUTCDate(since.getUTCDate() + offset);
      daily.set(date.toISOString().slice(0, 10), { credited: 0, spent: 0, entries: 0 });
    }
    for (const entry of trendEntries) {
      const bucket = daily.get(entry.createdAt.toISOString().slice(0, 10));
      if (!bucket) continue;
      if (entry.direction === "CREDIT") bucket.credited += entry.amount;
      else bucket.spent += entry.amount;
      bucket.entries += 1;
    }

    return {
      summary: {
        activePlayers,
        playersWithSparks: [...balances.values()].filter((balance) => balance > 0).length,
        totalAvailable: [...balances.values()].reduce(
          (total, balance) => total + Math.max(0, balance),
          0,
        ),
        totalCredited: creditTotal._sum.amount ?? 0,
        totalSpent: debitTotal._sum.amount ?? 0,
        ledgerEntries: ledgerEntryCount,
      },
      topBalances: rankedBalanceIds.flatMap((id) => {
        const user = rankedUserById.get(id);
        return user ? [{ ...user, balance: balances.get(id) ?? 0 }] : [];
      }),
      topSpenders: rankedSpenderIds.flatMap((id) => {
        const user = rankedUserById.get(id);
        return user ? [{ ...user, spent: spenderTotals.get(id) ?? 0 }] : [];
      }),
      spending: spendGroups.map((row) => ({
        transactionType: row.transactionType,
        amount: row._sum.amount ?? 0,
        transactions: row._count._all,
      })),
      trend: [...daily].map(([date, values]) => ({ date, ...values })),
      users: matchingPlayers.map((user) => ({
        ...user,
        balance: balances.get(user.id) ?? 0,
        spent: spenderTotals.get(user.id) ?? 0,
      })),
      recentActivity: recentEntries,
    };
  }

  async adjust(
    actorId: string,
    input: AdminSparksAdjustmentInput,
    requestId: string,
  ) {
    return prisma.$transaction(
      async (tx) => {
        const existing = await tx.sparksLedgerEntry.findUnique({
          where: { idempotencyKey: `admin-sparks:${input.idempotencyKey}` },
          select: {
            id: true,
            userId: true,
            direction: true,
            amount: true,
            createdById: true,
            internalNote: true,
            createdAt: true,
          },
        });
        if (existing) {
          if (
            existing.userId !== input.userId ||
            existing.createdById !== actorId ||
            existing.direction !== input.direction ||
            existing.amount !== input.amount
          ) {
            throw new Error("This Sparks adjustment request has already been used.");
          }
          return { ...existing, replayed: true };
        }

        const player = await tx.user.findFirst({
          where: { id: input.userId, roles: { has: "PLAYER" } },
          select: { id: true, username: true, displayName: true, status: true },
        });
        if (!player) throw new Error("Player account not found.");

        const rows = await tx.sparksLedgerEntry.groupBy({
          by: ["userId", "direction"],
          where: { userId: player.id },
          _sum: { amount: true },
        });
        const previousBalance = sparksBalances(rows).get(player.id) ?? 0;
        const balance = adjustedSparksBalance(previousBalance, input.direction, input.amount);
        const adjustmentId = crypto.randomUUID();
        const entry = await tx.sparksLedgerEntry.create({
          data: {
            id: adjustmentId,
            userId: player.id,
            direction: input.direction,
            amount: input.amount,
            transactionType: "MANUAL_ADJUSTMENT",
            referenceType: "ADMIN_SPARKS_ADJUSTMENT",
            referenceId: adjustmentId,
            idempotencyKey: `admin-sparks:${input.idempotencyKey}`,
            createdById: actorId,
            internalNote: input.description,
          },
          select: {
            id: true,
            direction: true,
            amount: true,
            internalNote: true,
            createdAt: true,
          },
        });
        await Promise.all([
          tx.auditLog.create({
            data: {
              actorId,
              action: `sparks.admin_adjustment.${input.direction.toLowerCase()}`,
              entityType: "User",
              entityId: player.id,
              requestId,
              reason: input.description,
              beforeSnapshot: { sparksBalance: previousBalance },
              afterSnapshot: {
                sparksBalance: balance,
                direction: input.direction,
                amount: input.amount,
                ledgerEntryId: entry.id,
              },
            },
          }),
          createNotification(tx, {
            recipientId: player.id,
            category: "SPARKS",
            title: "Sparks balance updated",
            body: `${input.direction === "CREDIT" ? "Added" : "Removed"} ${input.amount.toLocaleString()} Sparks. ${input.description}`,
            actionUrl: "/dashboard/profile",
            dedupeKey: `admin-sparks-adjustment:${entry.id}`,
          }),
        ]);
        return { ...entry, player, balance };
      },
      { isolationLevel: "Serializable" },
    );
  }
}
