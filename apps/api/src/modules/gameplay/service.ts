import { prisma } from "@nortix/database";

const DAY_MS = 86_400_000;
const utcDay = (date = new Date()) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

export const gameplayDeltaForEvent = (type: string, metadata: Record<string, unknown>) => ({
  joins: type === "PLAYER_JOIN" ? 1 : 0,
  playtimeSeconds: type === "PLAYTIME" ? Math.max(0, Number(metadata.seconds ?? 0)) : 0,
  playerKills: type === "PLAYER_KILL" ? 1 : 0,
  mobKills: type === "MOB_KILL" ? 1 : 0,
  blocksBroken: type === "BLOCK_BREAK" ? 1 : 0,
});

export class GameplayService {
  async recordPluginEvent(input: {
    eventId: string;
    userId: string;
    serverId: string;
    type: string;
    occurredAt: Date;
    metadata: Record<string, unknown>;
  }) {
    const delta = gameplayDeltaForEvent(input.type, input.metadata);
    if (Object.values(delta).every((value) => value === 0)) return false;
    return prisma.$transaction(async (tx) => {
      const claimed = await tx.analyticsEvent.updateMany({
        where: {
          id: input.eventId,
          profileAggregatedAt: null,
          OR: [{ userId: null }, { userId: input.userId }],
        },
        data: { userId: input.userId, profileAggregatedAt: new Date() },
      });
      if (claimed.count === 0) return false;
      const activityDate = utcDay(input.occurredAt);
      await tx.playerGameplayDailyStat.upsert({
        where: {
          userId_serverId_activityDate: {
            userId: input.userId,
            serverId: input.serverId,
            activityDate,
          },
        },
        create: {
          userId: input.userId,
          serverId: input.serverId,
          activityDate,
          ...delta,
        },
        update: {
          joins: { increment: delta.joins },
          playtimeSeconds: { increment: delta.playtimeSeconds },
          playerKills: { increment: delta.playerKills },
          mobKills: { increment: delta.mobKills },
          blocksBroken: { increment: delta.blocksBroken },
        },
      });
      return true;
    });
  }

  async summary(userId: string) {
    const today = utcDay();
    const windowStart = new Date(today.getTime() - 29 * DAY_MS);
    const rows = await prisma.playerGameplayDailyStat.findMany({
      where: { userId, activityDate: { gte: windowStart } },
      select: {
        activityDate: true,
        joins: true,
        playtimeSeconds: true,
        playerKills: true,
        mobKills: true,
        blocksBroken: true,
        server: { select: { id: true, name: true } },
      },
      orderBy: { activityDate: "asc" },
    });
    const totals = rows.reduce(
      (sum, row) => ({
        joins: sum.joins + row.joins,
        playtimeSeconds: sum.playtimeSeconds + row.playtimeSeconds,
        playerKills: sum.playerKills + row.playerKills,
        mobKills: sum.mobKills + row.mobKills,
        blocksBroken: sum.blocksBroken + row.blocksBroken,
      }),
      { joins: 0, playtimeSeconds: 0, playerKills: 0, mobKills: 0, blocksBroken: 0 },
    );
    const serverTotals = new Map<string, { name: string; joins: number; playtimeSeconds: number }>();
    for (const row of rows) {
      const current = serverTotals.get(row.server.id) ?? {
        name: row.server.name,
        joins: 0,
        playtimeSeconds: 0,
      };
      current.joins += row.joins;
      current.playtimeSeconds += row.playtimeSeconds;
      serverTotals.set(row.server.id, current);
    }
    const favoriteServer =
      [...serverTotals.values()].sort(
        (left, right) =>
          right.playtimeSeconds + right.joins * 60 - (left.playtimeSeconds + left.joins * 60),
      )[0]?.name ?? null;
    const daily = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today.getTime() - (6 - index) * DAY_MS);
      const matching = rows.filter((row) => row.activityDate.getTime() === date.getTime());
      return {
        date: date.toISOString(),
        label: new Intl.DateTimeFormat("en", { weekday: "short", timeZone: "UTC" }).format(date),
        playMinutes: Math.round(
          matching.reduce((sum, row) => sum + row.playtimeSeconds, 0) / 60,
        ),
        adventures: matching.reduce((sum, row) => sum + row.joins, 0),
      };
    });
    return {
      windowDays: 30,
      totals: {
        playMinutes: Math.round(totals.playtimeSeconds / 60),
        serverVisits: totals.joins,
        serversExplored: serverTotals.size,
        blocksBroken: totals.blocksBroken,
        playerWins: totals.playerKills,
        mobsDefeated: totals.mobKills,
      },
      favoriteServer,
      daily,
    };
  }
}
