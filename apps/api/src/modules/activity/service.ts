import { prisma, type Prisma } from "@nortix/database";

const DAY_MS = 86_400_000;
const utcDay = (date = new Date()) => {
  const day = new Date(date);
  day.setUTCHours(0, 0, 0, 0);
  return day;
};
type ActivityTransaction = Prisma.TransactionClient;

async function recordInTransaction(
  tx: ActivityTransaction,
  userId: string,
  kind: "WEB_OPEN" | "CAMPAIGN_PLAY",
  date = new Date(),
) {
  const activityDate = utcDay(date);
  return tx.userDailyActivity.upsert({
    where: { userId_activityDate: { userId, activityDate } },
    create: {
      userId,
      activityDate,
      webOpened: kind === "WEB_OPEN",
      campaignPlayed: kind === "CAMPAIGN_PLAY",
    },
    update: kind === "WEB_OPEN" ? { webOpened: true } : { campaignPlayed: true },
  });
}

export class ActivityService {
  async record(userId: string, kind: "WEB_OPEN" | "CAMPAIGN_PLAY", date = new Date()) {
    return prisma.$transaction((tx) => recordInTransaction(tx, userId, kind, date));
  }

  async recordInTransaction(
    tx: ActivityTransaction,
    userId: string,
    kind: "WEB_OPEN" | "CAMPAIGN_PLAY",
    date = new Date(),
  ) {
    return recordInTransaction(tx, userId, kind, date);
  }

  async streak(userId: string) {
    const today = utcDay();
    const rows = await prisma.userDailyActivity.findMany({
      where: {
        userId,
        activityDate: { gte: new Date(today.getTime() - 365 * DAY_MS), lte: today },
      },
      select: { activityDate: true, webOpened: true, campaignPlayed: true },
      orderBy: { activityDate: "asc" },
    });
    const activeDays = new Set(
      rows
        .filter((row) => row.webOpened || row.campaignPlayed)
        .map((row) => row.activityDate.getTime()),
    );
    let longest = 0;
    let run = 0;
    for (
      let cursor = new Date(today.getTime() - 364 * DAY_MS);
      cursor <= today;
      cursor = new Date(cursor.getTime() + DAY_MS)
    ) {
      if (activeDays.has(cursor.getTime())) {
        run++;
        longest = Math.max(longest, run);
      } else run = 0;
    }
    let current = 0;
    for (
      let cursor = today;
      activeDays.has(cursor.getTime());
      cursor = new Date(cursor.getTime() - DAY_MS)
    ) current++;
    const rowByDate = new Map(rows.map((row) => [row.activityDate.getTime(), row]));
    return {
      current, longest,
      today: {
        webOpened: rowByDate.get(today.getTime())?.webOpened ?? false,
        campaignPlayed: rowByDate.get(today.getTime())?.campaignPlayed ?? false,
        active: activeDays.has(today.getTime()),
      },
      days: Array.from({ length: 7 }, (_, index) => {
        const date = new Date(today.getTime() - (6 - index) * DAY_MS);
        return { date: date.toISOString(), active: activeDays.has(date.getTime()) };
      }),
    };
  }
}
