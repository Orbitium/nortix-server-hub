import { prisma, type Prisma } from "@nortix/database";

const ACCOUNT_QUEST_DATE = new Date("1970-01-01T00:00:00.000Z");

const placeholderQuestTypes = new Set(["DISCORD_JOIN", "FRIEND_REFERRAL"]);

type QuestTransaction = Prisma.TransactionClient;

async function isQuestComplete(tx: QuestTransaction, userId: string, type: string) {
  switch (type) {
    case "ACCOUNT_CREATED":
      return true;
    case "MINECRAFT_ACCOUNT_LINKED": {
      const [premium, cracked] = await Promise.all([
        tx.minecraftIdentity.findFirst({ where: { userId, verified: true }, select: { id: true } }),
        tx.crackedAccountLink.findFirst({ where: { userId, status: "ACTIVE" }, select: { id: true } }),
      ]);
      return Boolean(premium || cracked);
    }
    case "CAMPAIGN_COMPLETED":
      return Boolean(await tx.campaignParticipation.findFirst({
        where: { playerId: userId, OR: [{ status: "COMPLETED" }, { completions: { some: { status: "VERIFIED" } } }] },
        select: { id: true },
      }));
    case "SERVER_VOTED":
      return Boolean(await tx.serverVote.findFirst({ where: { playerId: userId }, select: { id: true } }));
    case "VERIFIED_SERVER_JOINED":
      return Boolean(await tx.campaignParticipation.findFirst({
        where: { playerId: userId, campaign: { server: { verificationStatus: "VERIFIED" } } },
        select: { id: true },
      }));
    case "DISCORD_JOIN":
    case "FRIEND_REFERRAL":
      return false;
    case "LOGIN_STREAK": {
      const rows = await tx.userDailyActivity.findMany({
        where: { userId, activityDate: { lte: new Date() } },
        select: { activityDate: true, webOpened: true, campaignPlayed: true },
        orderBy: { activityDate: "desc" }, take: 7,
      });
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      if (rows.length < 7 || rows[0]?.activityDate.getTime() !== today.getTime() || rows.some((row) => !row.webOpened && !row.campaignPlayed)) return false;
      return rows.every((row, index) => index === 0 || rows[index - 1]!.activityDate.getTime() - row.activityDate.getTime() === 86_400_000);
    }
    case "SPARKS_SHOP_PURCHASED":
      return Boolean(await tx.cosmeticPurchase.findFirst({ where: { userId }, select: { id: true } }));
    case "SERVER_REVIEW_WRITTEN":
      return Boolean(await tx.review.findFirst({ where: { playerId: userId }, select: { id: true } }));
    default:
      return false;
  }
}

export class QuestService {
  async evaluateAndAward(userId: string) {
    return prisma.$transaction(async (tx) => {
      const quests = await tx.dailyQuest.findMany({ where: { active: true }, orderBy: { title: "asc" } });
      const result = [];
      for (const quest of quests) {
        const complete = await isQuestComplete(tx, userId, quest.type);
        const current = await tx.userQuest.upsert({
          where: { userId_questId_questDate: { userId, questId: quest.id, questDate: ACCOUNT_QUEST_DATE } },
          create: { userId, questId: quest.id, questDate: ACCOUNT_QUEST_DATE, progress: complete ? quest.target : 0 },
          update: { progress: complete ? quest.target : undefined },
          select: { id: true, progress: true, completedAt: true },
        });
        let completedAt = current.completedAt;
        if (complete && !completedAt) {
          completedAt = new Date();
          await tx.userQuest.update({ where: { id: current.id }, data: { progress: quest.target, completedAt } });
          await tx.sparksLedgerEntry.upsert({
            where: { idempotencyKey: `quest:${userId}:${quest.slug}` },
            update: {},
            create: {
              userId,
              direction: "CREDIT",
              amount: quest.sparksReward,
              transactionType: "DAILY_QUEST",
              referenceType: "QUEST",
              referenceId: quest.id,
              idempotencyKey: `quest:${userId}:${quest.slug}`,
              internalNote: "Backend-verified account quest reward.",
            },
          });
        }
        result.push({
          ...quest,
          progress: complete ? quest.target : current.progress,
          completedAt,
          verificationPending: placeholderQuestTypes.has(quest.type),
        });
      }
      const balanceGroups = await tx.sparksLedgerEntry.groupBy({
        by: ["direction"],
        where: { userId },
        _sum: { amount: true },
      });
      const balance = balanceGroups.reduce(
        (total, group) => total + (group.direction === "CREDIT" ? 1 : -1) * (group._sum.amount ?? 0),
        0,
      );
      await tx.user.update({ where: { id: userId }, data: { sparksBalanceCache: balance } });
      return result;
    }, { isolationLevel: "Serializable" });
  }

  async ensureAccountQuests(userId: string) {
    return this.evaluateAndAward(userId);
  }
}
