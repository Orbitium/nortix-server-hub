import { prisma, type Prisma } from "@nortix/database";
import { calculateActivityStreak, utcActivityDay } from "./policy.js";

type ActivityTransaction = Prisma.TransactionClient;
type ActivityStore = Pick<ActivityTransaction, "userDailyActivity">;

async function recordInTransaction(
  tx: ActivityTransaction,
  userId: string,
  kind: "WEB_OPEN" | "CAMPAIGN_PLAY" | "VERIFIED_SERVER_JOIN",
  date = new Date(),
) {
  const activityDate = utcActivityDay(date);
  return tx.userDailyActivity.upsert({
    where: { userId_activityDate: { userId, activityDate } },
    create: {
      userId,
      activityDate,
      webOpened: kind === "WEB_OPEN",
      campaignPlayed: kind === "CAMPAIGN_PLAY",
      verifiedServerJoined: kind === "VERIFIED_SERVER_JOIN",
    },
    update:
      kind === "WEB_OPEN"
        ? { webOpened: true }
        : kind === "CAMPAIGN_PLAY"
          ? { campaignPlayed: true }
          : { verifiedServerJoined: true },
  });
}

async function readStreak(store: ActivityStore, userId: string, now = new Date()) {
  const rows = await store.userDailyActivity.findMany({
    where: {
      userId,
      activityDate: { lte: utcActivityDay(now) },
    },
    select: {
      activityDate: true,
      webOpened: true,
      campaignPlayed: true,
      verifiedServerJoined: true,
    },
    orderBy: { activityDate: "asc" },
  });
  return calculateActivityStreak(rows, now);
}

export class ActivityService {
  async record(
    userId: string,
    kind: "WEB_OPEN" | "CAMPAIGN_PLAY" | "VERIFIED_SERVER_JOIN",
    date = new Date(),
  ) {
    return prisma.$transaction((tx) => recordInTransaction(tx, userId, kind, date));
  }

  async recordInTransaction(
    tx: ActivityTransaction,
    userId: string,
    kind: "WEB_OPEN" | "CAMPAIGN_PLAY" | "VERIFIED_SERVER_JOIN",
    date = new Date(),
  ) {
    return recordInTransaction(tx, userId, kind, date);
  }

  async streak(userId: string) {
    return readStreak(prisma, userId);
  }

  async checkInAndStreak(userId: string, date = new Date()) {
    return prisma.$transaction(async (tx) => {
      await recordInTransaction(tx, userId, "WEB_OPEN", date);
      return readStreak(tx, userId, date);
    });
  }
}
