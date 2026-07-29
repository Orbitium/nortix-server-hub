import {
  prisma,
  Prisma,
  type LedgerDirection,
  type SparksTransactionType,
} from "@nortix/database";
import { effectiveHypeScore, utcDayStart, utcMonthStart } from "../hype/policy.js";
import {
  SINK_KEYS,
  SINK_LABELS,
  SOURCE_KEYS,
  SOURCE_LABELS,
  economyAlerts,
  isRedemptionDebit,
  isRedemptionRefund,
  median,
  percentChange,
  safeRate,
  sinkForTransaction,
  sourceForTransaction,
  sparkLiabilityCents,
  type SinkKey,
  type SourceKey,
} from "./economy-policy.js";
import { sparksBalances } from "./policy.js";

const DAY_MS = 86_400_000;

type DailyLedgerRow = {
  day: Date;
  direction: LedgerDirection;
  transactionType: SparksTransactionType;
  amount: bigint;
  transactions: bigint;
};

const playerSelect = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  status: true,
  lastActiveAt: true,
} satisfies Prisma.UserSelect;

const dateKey = (date: Date) => date.toISOString().slice(0, 10);

const dailyLedger = (from: Date, to: Date) =>
  prisma.$queryRaw<DailyLedgerRow[]>(Prisma.sql`
    SELECT
      date_trunc('day', "createdAt" AT TIME ZONE 'UTC') AS "day",
      "direction",
      "transactionType",
      SUM("amount")::bigint AS "amount",
      COUNT(*)::bigint AS "transactions"
    FROM "SparksLedgerEntry"
    WHERE "createdAt" >= ${from} AND "createdAt" < ${to}
    GROUP BY 1, 2, 3
    ORDER BY 1 ASC
  `);

const totalsForRows = (rows: readonly DailyLedgerRow[]) => {
  let issued = 0;
  let burned = 0;
  let redeemed = 0;
  for (const row of rows) {
    const amount = Number(row.amount);
    if (row.direction === "CREDIT") {
      if (isRedemptionRefund(row.transactionType)) redeemed -= amount;
      else issued += amount;
    } else if (isRedemptionDebit(row.transactionType)) {
      redeemed += amount;
    } else {
      burned += amount;
    }
  }
  return { issued, burned, redeemed: Math.max(0, redeemed) };
};

const makeBreakdown = <Key extends string>(
  keys: readonly Key[],
  labels: Record<Key, string>,
  current: Map<Key, { amount: number; transactions: number }>,
  previous: Map<Key, { amount: number; transactions: number }>,
) => {
  const total = [...current.values()].reduce((sum, value) => sum + value.amount, 0);
  return keys.map((key) => {
    const currentValue = current.get(key) ?? { amount: 0, transactions: 0 };
    const previousValue = previous.get(key) ?? { amount: 0, transactions: 0 };
    return {
      key,
      label: labels[key],
      total: currentValue.amount,
      transactions: currentValue.transactions,
      percentage: safeRate(currentValue.amount, total) * 100,
      previousTotal: previousValue.amount,
      changePercent: percentChange(currentValue.amount, previousValue.amount),
    };
  });
};

const addBreakdown = <Key extends string>(
  map: Map<Key, { amount: number; transactions: number }>,
  key: Key,
  amount: number,
  transactions: number,
) => {
  const current = map.get(key) ?? { amount: 0, transactions: 0 };
  current.amount += amount;
  current.transactions += transactions;
  map.set(key, current);
};

const breakdownForRows = (rows: readonly DailyLedgerRow[]) => {
  const sources = new Map<SourceKey, { amount: number; transactions: number }>();
  const sinks = new Map<SinkKey, { amount: number; transactions: number }>();
  for (const row of rows) {
    const amount = Number(row.amount);
    const transactions = Number(row.transactions);
    if (row.direction === "CREDIT") {
      const source = sourceForTransaction(row.transactionType);
      if (source) addBreakdown(sources, source, amount, transactions);
    } else {
      const sink = sinkForTransaction(row.transactionType);
      if (sink) addBreakdown(sinks, sink, amount, transactions);
    }
  }
  return { sources, sinks };
};

const calculateHypeDecay = (
  periods: Array<{ periodStart: Date; amount: number }>,
  from: Date,
  to: Date,
) => {
  const byMonth = new Map(periods.map((period) => [dateKey(utcMonthStart(period.periodStart)), period.amount]));
  if (byMonth.size === 0) return 0;
  const months = [...byMonth.keys()].sort();
  let score = 0;
  let decayInRange = 0;
  let cursor = new Date(`${months[0]}T00:00:00.000Z`);
  const last = new Date(`${months.at(-1)}T00:00:00.000Z`);
  while (cursor <= last || cursor < to) {
    if (cursor > new Date(`${months[0]}T00:00:00.000Z`)) {
      const carry = Math.floor(score * 0.2);
      if (cursor >= from && cursor < to) decayInRange += score - carry;
      score = carry;
    }
    score += byMonth.get(dateKey(cursor)) ?? 0;
    cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
    if (cursor > last && cursor >= to) break;
  }
  return decayInRange;
};

export type EconomyRange = {
  from: Date;
  to: Date;
  label: string;
};

export class AdminSparkEconomyService {
  async dashboard(range: EconomyRange, search = "") {
    const durationMs = range.to.getTime() - range.from.getTime();
    const previousFrom = new Date(range.from.getTime() - durationMs);
    const today = utcDayStart();
    const tomorrow = new Date(today.getTime() + DAY_MS);
    const trailingStart = new Date(today.getTime() - 7 * DAY_MS);
    const now = new Date();

    const [
      currentDaily,
      previousDaily,
      todayDaily,
      lifetimeTypeGroups,
      userBalanceGroups,
      openingBalanceGroups,
      active24h,
      active7d,
      active30d,
      matchingPlayers,
      recentActivity,
      cosmetics,
      currentCosmeticEntries,
      previousCosmeticEntries,
      sponsoredPurchases,
      serverStorePurchases,
      pendingSponsored,
      pendingServerStore,
      rewardedSessions,
      rewardedTodayByUser,
      hypeRange,
      hypePrevious,
      hypeToday,
      hypePeriods,
      awardRange,
      awardPrevious,
      servers,
      manualGrants,
      trailingDaily,
    ] = await Promise.all([
      dailyLedger(range.from, range.to),
      dailyLedger(previousFrom, range.from),
      dailyLedger(today, tomorrow),
      prisma.sparksLedgerEntry.groupBy({
        by: ["direction", "transactionType"],
        _sum: { amount: true },
        _count: { _all: true },
      }),
      prisma.sparksLedgerEntry.groupBy({
        by: ["userId", "direction"],
        _sum: { amount: true },
      }),
      prisma.sparksLedgerEntry.groupBy({
        by: ["direction"],
        where: { createdAt: { lt: range.from } },
        _sum: { amount: true },
      }),
      prisma.user.count({
        where: { roles: { has: "PLAYER" }, lastActiveAt: { gte: new Date(now.getTime() - DAY_MS) } },
      }),
      prisma.user.count({
        where: { roles: { has: "PLAYER" }, lastActiveAt: { gte: new Date(now.getTime() - 7 * DAY_MS) } },
      }),
      prisma.user.count({
        where: { roles: { has: "PLAYER" }, lastActiveAt: { gte: new Date(now.getTime() - 30 * DAY_MS) } },
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
      prisma.sparksLedgerEntry.findMany({
        where: { createdAt: { gte: range.from, lt: range.to } },
        select: {
          id: true,
          direction: true,
          amount: true,
          transactionType: true,
          referenceType: true,
          referenceId: true,
          internalNote: true,
          createdAt: true,
          user: { select: playerSelect },
          createdBy: { select: { id: true, username: true, displayName: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 250,
      }),
      prisma.cosmeticItem.findMany({
        select: { id: true, type: true, season: true },
      }),
      prisma.sparksLedgerEntry.findMany({
        where: {
          direction: "DEBIT",
          transactionType: "COSMETIC_PURCHASE",
          createdAt: { gte: range.from, lt: range.to },
        },
        select: { amount: true, referenceId: true },
      }),
      prisma.sparksLedgerEntry.findMany({
        where: {
          direction: "DEBIT",
          transactionType: "COSMETIC_PURCHASE",
          createdAt: { gte: previousFrom, lt: range.from },
        },
        select: { amount: true, referenceId: true },
      }),
      prisma.sponsoredPurchase.findMany({
        where: {
          createdAt: { gte: range.from, lt: range.to },
          status: { notIn: ["REFUNDED", "CANCELLED"] },
        },
        select: {
          id: true,
          status: true,
          quantity: true,
          priceSparks: true,
          item: { select: { id: true, name: true, store: { select: { name: true } } } },
        },
      }),
      prisma.serverStorePurchase.findMany({
        where: {
          createdAt: { gte: range.from, lt: range.to },
          status: { not: "REFUNDED" },
        },
        select: {
          id: true,
          status: true,
          quantity: true,
          priceSparks: true,
          ownerProceedsCents: true,
          item: {
            select: {
              id: true,
              name: true,
              store: { select: { name: true, server: { select: { name: true } } } },
            },
          },
        },
      }),
      prisma.sponsoredPurchase.findMany({
        where: { status: { in: ["REQUESTED", "PROCESSING"] } },
        select: { priceSparks: true },
      }),
      prisma.serverStorePurchase.findMany({
        where: { status: { in: ["PURCHASED", "PENDING_DELIVERY"] } },
        select: { priceSparks: true, ownerProceedsCents: true },
      }),
      prisma.rewardedVoteSession.findMany({
        where: { consumedAt: { gte: range.from, lt: range.to } },
        select: { consumedAt: true, playerId: true },
      }),
      prisma.rewardedVoteSession.groupBy({
        by: ["playerId"],
        where: { consumedAt: { gte: today, lt: tomorrow } },
        _count: { _all: true },
      }),
      prisma.hypePurchase.groupBy({
        by: ["serverId"],
        where: { createdAt: { gte: range.from, lt: range.to } },
        _sum: { hypeAmount: true, sparksCost: true },
        _count: { _all: true },
      }),
      prisma.hypePurchase.groupBy({
        by: ["serverId"],
        where: { createdAt: { gte: previousFrom, lt: range.from } },
        _sum: { sparksCost: true },
      }),
      prisma.hypePurchase.groupBy({
        by: ["serverId"],
        where: { createdAt: { gte: today, lt: tomorrow } },
        _sum: { hypeAmount: true },
      }),
      prisma.hypePurchase.groupBy({
        by: ["serverId", "periodStart"],
        _sum: { hypeAmount: true },
      }),
      prisma.serverAwardPurchase.groupBy({
        by: ["serverId"],
        where: { createdAt: { gte: range.from, lt: range.to } },
        _sum: { sparksCost: true },
        _count: { _all: true },
      }),
      prisma.serverAwardPurchase.groupBy({
        by: ["serverId"],
        where: { createdAt: { gte: previousFrom, lt: range.from } },
        _sum: { sparksCost: true },
        _count: { _all: true },
      }),
      prisma.server.findMany({
        where: { publicListing: true, moderationStatus: "APPROVED" },
        select: {
          id: true,
          name: true,
          slug: true,
          logoUrl: true,
          hypeScore: true,
          hypePeriodStart: true,
          _count: { select: { awardPurchases: true } },
        },
      }),
      prisma.sparksLedgerEntry.findMany({
        where: {
          direction: "CREDIT",
          transactionType: "MANUAL_ADJUSTMENT",
          createdAt: { gte: range.from, lt: range.to },
        },
        select: { amount: true },
        orderBy: { amount: "desc" },
        take: 20,
      }),
      dailyLedger(trailingStart, today),
    ]);

    const balances = sparksBalances(userBalanceGroups);
    const positiveBalances = [...balances.values()].map((balance) => Math.max(0, balance));
    const totalHeld = positiveBalances.reduce((sum, balance) => sum + balance, 0);
    const allTime = totalsForRows(
      lifetimeTypeGroups.map((row) => ({
        day: new Date(0),
        direction: row.direction,
        transactionType: row.transactionType,
        amount: BigInt(row._sum.amount ?? 0),
        transactions: BigInt(row._count._all),
      })),
    );
    const currentTotals = totalsForRows(currentDaily);
    const todayTotals = totalsForRows(todayDaily);
    const priorTotals = totalsForRows(previousDaily);
    const trailingTotals = totalsForRows(trailingDaily);
    const rangeDays = Math.max(1, Math.ceil(durationMs / DAY_MS));

    const currentBreakdown = breakdownForRows(currentDaily);
    const previousBreakdown = breakdownForRows(previousDaily);
    const cosmeticById = new Map(cosmetics.map((item) => [item.id, item]));
    const applyCosmeticSegments = (
      entries: Array<{ amount: number; referenceId: string }>,
      sinkMap: Map<SinkKey, { amount: number; transactions: number }>,
    ) => {
      const cosmetic = sinkMap.get("COSMETICS") ?? { amount: 0, transactions: 0 };
      sinkMap.set("COSMETICS", { amount: 0, transactions: 0 });
      let classifiedAmount = 0;
      for (const entry of entries) {
        const item = cosmeticById.get(entry.referenceId);
        const segment: SinkKey = item?.season
          ? "SEASONAL_ITEMS"
          : item?.type === "BADGE" || item?.type === "TITLE"
            ? "PROFILE_ITEMS"
            : "COSMETICS";
        addBreakdown(sinkMap, segment, entry.amount, 1);
        classifiedAmount += entry.amount;
      }
      if (classifiedAmount < cosmetic.amount) {
        addBreakdown(
          sinkMap,
          "COSMETICS",
          cosmetic.amount - classifiedAmount,
          Math.max(0, cosmetic.transactions - entries.length),
        );
      }
    };
    applyCosmeticSegments(currentCosmeticEntries, currentBreakdown.sinks);
    applyCosmeticSegments(previousCosmeticEntries, previousBreakdown.sinks);

    const sourceBreakdown = makeBreakdown(
      SOURCE_KEYS,
      SOURCE_LABELS,
      currentBreakdown.sources,
      previousBreakdown.sources,
    );
    const sinkBreakdown = makeBreakdown(
      SINK_KEYS,
      SINK_LABELS,
      currentBreakdown.sinks,
      previousBreakdown.sinks,
    );

    let runningBalance = openingBalanceGroups.reduce(
      (total, row) =>
        total + (row.direction === "CREDIT" ? row._sum.amount ?? 0 : -(row._sum.amount ?? 0)),
      0,
    );
    const rowsByDay = new Map<string, DailyLedgerRow[]>();
    for (const row of currentDaily) {
      const key = dateKey(row.day);
      const entries = rowsByDay.get(key) ?? [];
      entries.push(row);
      rowsByDay.set(key, entries);
    }
    const hypeEvents = await prisma.hypePurchase.findMany({
      where: { createdAt: { gte: range.from, lt: range.to } },
      select: { createdAt: true, hypeAmount: true },
    });
    const awardEvents = await prisma.serverAwardPurchase.findMany({
      where: { createdAt: { gte: range.from, lt: range.to } },
      select: { createdAt: true },
    });
    const hypeByDay = new Map<string, number>();
    const awardsByDay = new Map<string, number>();
    for (const event of hypeEvents) {
      const key = dateKey(event.createdAt);
      hypeByDay.set(key, (hypeByDay.get(key) ?? 0) + event.hypeAmount);
    }
    for (const event of awardEvents) {
      const key = dateKey(event.createdAt);
      awardsByDay.set(key, (awardsByDay.get(key) ?? 0) + 1);
    }
    const adsByDay = new Map<string, number>();
    for (const session of rewardedSessions) {
      if (!session.consumedAt) continue;
      const key = dateKey(session.consumedAt);
      adsByDay.set(key, (adsByDay.get(key) ?? 0) + 1);
    }
    const trend = Array.from({ length: rangeDays }, (_, index) => {
      const date = new Date(range.from.getTime() + index * DAY_MS);
      const key = dateKey(date);
      const rows = rowsByDay.get(key) ?? [];
      const totals = totalsForRows(rows);
      const net = rows.reduce(
        (sum, row) =>
          sum + (row.direction === "CREDIT" ? Number(row.amount) : -Number(row.amount)),
        0,
      );
      runningBalance = Math.max(0, runningBalance + net);
      return {
        date: key,
        issued: totals.issued,
        burned: totals.burned,
        redeemed: totals.redeemed,
        credited: rows
          .filter((row) => row.direction === "CREDIT")
          .reduce((sum, row) => sum + Number(row.amount), 0),
        spent: rows
          .filter((row) => row.direction === "DEBIT")
          .reduce((sum, row) => sum + Number(row.amount), 0),
        entries: rows.reduce((sum, row) => sum + Number(row.transactions), 0),
        outstandingLiabilityCents: sparkLiabilityCents(runningBalance),
        burnToIssueRatio: safeRate(totals.burned, totals.issued),
        adsWatched: adsByDay.get(key) ?? 0,
        estimatedAdRevenueCents: null,
        adSparkLiabilityCents: 0,
        hypeGenerated: hypeByDay.get(key) ?? 0,
        awardsPurchased: awardsByDay.get(key) ?? 0,
      };
    });

    const lifetimeByUser = new Map<
      string,
      { earned: number; spent: number; balance: number }
    >();
    for (const row of userBalanceGroups) {
      const current = lifetimeByUser.get(row.userId) ?? { earned: 0, spent: 0, balance: 0 };
      const amount = row._sum.amount ?? 0;
      if (row.direction === "CREDIT") current.earned += amount;
      else current.spent += amount;
      current.balance += row.direction === "CREDIT" ? amount : -amount;
      lifetimeByUser.set(row.userId, current);
    }
    const topIds = [...lifetimeByUser]
      .sort((left, right) => right[1].balance - left[1].balance)
      .slice(0, 25)
      .map(([userId]) => userId);
    const [topUserRecords, topRedemptions, topManualCredits] = await Promise.all([
      prisma.user.findMany({ where: { id: { in: topIds } }, select: playerSelect }),
      topIds.length
        ? prisma.sparksLedgerEntry.groupBy({
            by: ["userId", "direction", "transactionType"],
            where: {
              userId: { in: topIds },
              transactionType: {
                in: [
                  "SPONSORED_PURCHASE",
                  "SPONSORED_PURCHASE_REFUND",
                  "SERVER_STORE_PURCHASE",
                  "SERVER_STORE_PURCHASE_REFUND",
                ],
              },
            },
            _sum: { amount: true },
            _count: { _all: true },
          })
        : Promise.resolve([]),
      topIds.length
        ? prisma.sparksLedgerEntry.groupBy({
            by: ["userId"],
            where: {
              userId: { in: topIds },
              direction: "CREDIT",
              transactionType: "MANUAL_ADJUSTMENT",
            },
            _sum: { amount: true },
          })
        : Promise.resolve([]),
    ]);
    const userById = new Map(topUserRecords.map((user) => [user.id, user]));
    const redemptionByUser = new Map<string, { sparks: number; transactions: number }>();
    for (const row of topRedemptions) {
      const current = redemptionByUser.get(row.userId) ?? { sparks: 0, transactions: 0 };
      const signed =
        row.direction === "DEBIT" ? row._sum.amount ?? 0 : -(row._sum.amount ?? 0);
      current.sparks += signed;
      current.transactions += row.direction === "DEBIT" ? row._count._all : 0;
      redemptionByUser.set(row.userId, current);
    }
    const manualByUser = new Map(
      topManualCredits.map((row) => [row.userId, row._sum.amount ?? 0]),
    );
    const topUsers = topIds.flatMap((id) => {
      const user = userById.get(id);
      const lifetime = lifetimeByUser.get(id);
      if (!user || !lifetime) return [];
      const redemption = redemptionByUser.get(id) ?? { sparks: 0, transactions: 0 };
      const flags = [
        ...(lifetime.balance >= 100_000 ? ["EXTREMELY_HIGH_BALANCE"] : []),
        ...((manualByUser.get(id) ?? 0) >= 10_000 ? ["LARGE_MANUAL_GRANTS"] : []),
        ...(lifetime.earned >= 50_000 && lifetime.spent < lifetime.earned * 0.05
          ? ["LOW_SPEND_VELOCITY"]
          : []),
      ];
      return [
        {
          ...user,
          balance: Math.max(0, lifetime.balance),
          lifetimeEarned: lifetime.earned,
          lifetimeSpent: lifetime.spent,
          burnRatio: safeRate(lifetime.spent - redemption.sparks, lifetime.earned),
          redemptionHistory: redemption,
          flags,
        },
      ];
    });

    const distributionDefinitions = [
      { label: "0–100", minimum: 0, maximum: 99 },
      { label: "100–500", minimum: 100, maximum: 499 },
      { label: "500–1,000", minimum: 500, maximum: 999 },
      { label: "1k–5k", minimum: 1_000, maximum: 4_999 },
      { label: "5k–10k", minimum: 5_000, maximum: 9_999 },
      { label: "10k+", minimum: 10_000, maximum: Number.POSITIVE_INFINITY },
    ];
    const distribution = distributionDefinitions.map((bucket) => {
      const values = positiveBalances.filter(
        (balance) => balance >= bucket.minimum && balance <= bucket.maximum,
      );
      return {
        label: bucket.label,
        users: values.length,
        percentage: safeRate(values.length, positiveBalances.length) * 100,
        totalHeld: values.reduce((sum, value) => sum + value, 0),
      };
    });

    const rewardMap = new Map<
      string,
      { name: string; provider: string; redemptions: number; sparks: number; costCents: number }
    >();
    for (const purchase of sponsoredPurchases) {
      const key = `sponsored:${purchase.item.id}`;
      const current = rewardMap.get(key) ?? {
        name: purchase.item.name,
        provider: purchase.item.store.name,
        redemptions: 0,
        sparks: 0,
        costCents: 0,
      };
      current.redemptions += purchase.quantity;
      current.sparks += purchase.priceSparks;
      current.costCents += sparkLiabilityCents(purchase.priceSparks);
      rewardMap.set(key, current);
    }
    for (const purchase of serverStorePurchases) {
      const key = `server:${purchase.item.id}`;
      const current = rewardMap.get(key) ?? {
        name: purchase.item.name,
        provider: purchase.item.store.server.name,
        redemptions: 0,
        sparks: 0,
        costCents: 0,
      };
      current.redemptions += purchase.quantity;
      current.sparks += purchase.priceSparks;
      current.costCents += purchase.ownerProceedsCents;
      rewardMap.set(key, current);
    }
    const pendingSparks =
      pendingSponsored.reduce((sum, purchase) => sum + purchase.priceSparks, 0) +
      pendingServerStore.reduce((sum, purchase) => sum + purchase.priceSparks, 0);
    const pendingFulfillmentCostCents =
      pendingSponsored.reduce(
        (sum, purchase) => sum + sparkLiabilityCents(purchase.priceSparks),
        0,
      ) +
      pendingServerStore.reduce((sum, purchase) => sum + purchase.ownerProceedsCents, 0);
    const redemptionDashboard = {
      rewardsRedeemed:
        sponsoredPurchases.reduce((sum, purchase) => sum + purchase.quantity, 0) +
        serverStorePurchases.reduce((sum, purchase) => sum + purchase.quantity, 0),
      sparksRedeemed: currentTotals.redeemed,
      averageSparkCost:
        rewardMap.size > 0
          ? Math.round(
              [...rewardMap.values()].reduce((sum, reward) => sum + reward.sparks, 0) /
                Math.max(
                  1,
                  [...rewardMap.values()].reduce((sum, reward) => sum + reward.redemptions, 0),
                ),
            )
          : 0,
      estimatedFulfillmentCostCents: [...rewardMap.values()].reduce(
        (sum, reward) => sum + reward.costCents,
        0,
      ),
      estimatedOutstandingLiabilityCents: pendingFulfillmentCostCents,
      redemptionRate: safeRate(currentTotals.redeemed, currentTotals.issued) * 100,
      pendingClaims: pendingSponsored.length + pendingServerStore.length,
      pendingSparks,
      mostRedeemed: [...rewardMap.values()]
        .sort((left, right) => right.redemptions - left.redemptions)
        .slice(0, 10),
      costModel:
        "Sponsored gifts use the internal $1 per 1,000 Sparks planning estimate; server-market costs use recorded owner proceeds.",
    };

    const hypeByServer = new Map(hypeRange.map((row) => [row.serverId, row]));
    const previousHypeByServer = new Map(hypePrevious.map((row) => [row.serverId, row]));
    const hypeTodayByServer = new Map(hypeToday.map((row) => [row.serverId, row]));
    const awardsByServer = new Map(awardRange.map((row) => [row.serverId, row]));
    const previousAwardsByServer = new Map(awardPrevious.map((row) => [row.serverId, row]));
    const periodsByServer = new Map<string, Array<{ periodStart: Date; amount: number }>>();
    for (const row of hypePeriods) {
      const periods = periodsByServer.get(row.serverId) ?? [];
      periods.push({ periodStart: row.periodStart, amount: row._sum.hypeAmount ?? 0 });
      periodsByServer.set(row.serverId, periods);
    }
    const serverEconomy = servers
      .map((server) => {
        const hype = hypeByServer.get(server.id);
        const awards = awardsByServer.get(server.id);
        const previousAwards = previousAwardsByServer.get(server.id);
        const contributions = (hype?._sum.sparksCost ?? 0) + (awards?._sum.sparksCost ?? 0);
        const previousContributions =
          (previousHypeByServer.get(server.id)?._sum.sparksCost ?? 0) +
          (previousAwards?._sum.sparksCost ?? 0);
        return {
          id: server.id,
          name: server.name,
          slug: server.slug,
          logoUrl: server.logoUrl,
          totalHype: effectiveHypeScore(server.hypeScore, server.hypePeriodStart),
          hypeGenerated: hype?._sum.hypeAmount ?? 0,
          hypeGeneratedToday: hypeTodayByServer.get(server.id)?._sum.hypeAmount ?? 0,
          hypeDecayed: calculateHypeDecay(periodsByServer.get(server.id) ?? [], range.from, range.to),
          awardsReceived: awards?._count._all ?? 0,
          awardsAllTime: server._count.awardPurchases,
          sparkContributions: contributions,
          trendPercent: percentChange(contributions, previousContributions),
        };
      })
      .sort(
        (left, right) =>
          right.sparkContributions - left.sparkContributions ||
          right.totalHype - left.totalHype,
      )
      .slice(0, 100);

    const trailingDays = 7;
    const trailingAverageIssued = trailingTotals.issued / trailingDays;
    const trailingAverageRedeemed = trailingTotals.redeemed / trailingDays;
    const suspiciousUsers = topUsers.filter((user) => user.flags.length > 0).length;
    const alerts = economyAlerts({
      issuedToday: todayTotals.issued,
      trailingAverageIssued,
      redeemedToday: todayTotals.redeemed,
      trailingAverageRedeemed,
      burnRate: safeRate(todayTotals.burned, todayTotals.issued),
      inflationToday: todayTotals.issued - todayTotals.burned - todayTotals.redeemed,
      largestManualGrant: manualGrants[0]?.amount ?? 0,
      highBalanceUsers: positiveBalances.filter((balance) => balance >= 100_000).length,
      suspiciousUsers,
      maxAdsPerUserToday: Math.max(
        0,
        ...rewardedTodayByUser.map((row) => row._count._all),
      ),
      adDailyLimit: 7,
    });

    return {
      generatedAt: now.toISOString(),
      range: {
        from: range.from.toISOString(),
        toExclusive: range.to.toISOString(),
        label: range.label,
        days: rangeDays,
      },
      overview: {
        totalIssued: allTime.issued,
        totalBurned: allTime.burned,
        totalRedeemed: allTime.redeemed,
        totalHeld,
        netInflation: allTime.issued - allTime.burned - allTime.redeemed,
        averagePerActiveUser: active30d > 0 ? Math.round(totalHeld / active30d) : 0,
        activeUsers: { hours24: active24h, days7: active7d, days30: active30d },
      },
      health: {
        issuedToday: todayTotals.issued,
        burnedToday: todayTotals.burned,
        redeemedToday: todayTotals.redeemed,
        burnRate: safeRate(todayTotals.burned, todayTotals.issued) * 100,
        redemptionRate: safeRate(todayTotals.redeemed, todayTotals.issued) * 100,
        inflationRate:
          safeRate(
            todayTotals.issued - todayTotals.burned - todayTotals.redeemed,
            todayTotals.issued,
          ) * 100,
        burnToIssueRatio: safeRate(todayTotals.burned, todayTotals.issued),
        averageBalance:
          positiveBalances.length > 0 ? totalHeld / positiveBalances.length : 0,
        medianBalance: median(positiveBalances),
        averageDailyEarnings: currentTotals.issued / rangeDays,
        averageDailySpending: (currentTotals.burned + currentTotals.redeemed) / rangeDays,
        outstandingLiabilityCents: sparkLiabilityCents(totalHeld),
        previousPeriod: priorTotals,
      },
      sources: sourceBreakdown,
      sinks: sinkBreakdown,
      redemption: redemptionDashboard,
      rewardedAds: {
        adsWatched: rewardedSessions.length,
        estimatedAdRevenueCents: null,
        sparksGranted: 0,
        estimatedSparkLiabilityCents: 0,
        averageRevenuePerAdCents: null,
        averageSparkReward: 0,
        revenueTrackingConfigured: false,
        note: "Google web rewarded completions are recorded for rewarded voting, but verified revenue and Spark grants are not currently ingested.",
      },
      distribution,
      topUsers,
      serverEconomy,
      alerts,
      trend,
      users: matchingPlayers.map((user) => {
        const lifetime = lifetimeByUser.get(user.id) ?? { earned: 0, spent: 0, balance: 0 };
        return {
          ...user,
          balance: Math.max(0, lifetime.balance),
          spent: lifetime.spent,
          earned: lifetime.earned,
        };
      }),
      recentActivity,
      assumptions: {
        sparkLiabilityCentsPerThousand: 100,
        adRevenueTracking: false,
        weeklyQuestSourceAvailable: false,
        marketplaceFeeSinkAvailable: false,
      },
      summary: {
        activePlayers: active30d,
        playersWithSparks: positiveBalances.filter((balance) => balance > 0).length,
        totalAvailable: totalHeld,
        totalCredited: allTime.issued,
        totalSpent: allTime.burned + allTime.redeemed,
        ledgerEntries: lifetimeTypeGroups.reduce((sum, row) => sum + row._count._all, 0),
      },
      topBalances: topUsers.slice(0, 10).map((user) => ({
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        status: user.status,
        lastActiveAt: user.lastActiveAt,
        balance: user.balance,
      })),
      topSpenders: [...topUsers]
        .sort((left, right) => right.lifetimeSpent - left.lifetimeSpent)
        .slice(0, 10)
        .map((user) => ({
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          status: user.status,
          lastActiveAt: user.lastActiveAt,
          spent: user.lifetimeSpent,
        })),
      spending: sinkBreakdown.map((sink) => ({
        transactionType: sink.label.toUpperCase().replaceAll(" ", "_"),
        amount: sink.total,
        transactions: sink.transactions,
      })),
    };
  }
}
