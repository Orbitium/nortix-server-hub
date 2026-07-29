import { prisma, type Prisma } from "@nortix/database";
import { reconcileReferredUser } from "../referrals/service.js";
import { calculateActivityStreak } from "../activity/policy.js";

const ACCOUNT_QUEST_DATE = new Date("1970-01-01T00:00:00.000Z");
const utcDay = (date = new Date()) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
export const questDateForCadence = (cadence: string, date = new Date()) =>
  cadence === "DAILY" ? utcDay(date) : ACCOUNT_QUEST_DATE;

const placeholderQuestTypes = new Set(["DISCORD_JOIN"]);

type QuestTransaction = Prisma.TransactionClient;

async function isQuestComplete(
  tx: QuestTransaction,
  userId: string,
  type: string,
  questDate: Date,
  target: number,
) {
  const nextDay = new Date(questDate.getTime() + 86_400_000);
  switch (type) {
    case "ACCOUNT_CREATED":
      return true;
    case "MINECRAFT_ACCOUNT_LINKED": {
      const [premium, cracked] = await Promise.all([
        tx.minecraftIdentity.findFirst({ where: { userId, verified: true }, select: { id: true } }),
        tx.crackedAccountLink.findFirst({
          where: { userId, status: "ACTIVE" },
          select: { id: true },
        }),
      ]);
      return Boolean(premium || cracked);
    }
    case "CAMPAIGN_COMPLETED": {
      const candidates = await tx.campaignParticipation.findMany({
        where: {
          playerId: userId,
          completions: {
            some: {
              status: "VERIFIED",
              reviewedAt: { gte: questDate, lt: nextDay },
            },
          },
        },
        select: {
          campaign: { select: { milestones: { select: { id: true } } } },
          completions: { where: { status: "VERIFIED" }, select: { milestoneId: true } },
        },
      });
      return candidates.some(
        (participation) =>
          participation.campaign.milestones.length > 0 &&
          participation.completions.length >= participation.campaign.milestones.length,
      );
    }
    case "SERVER_VOTED":
      return Boolean(
        await tx.serverVote.findFirst({
          where: { playerId: userId, voteDate: questDate },
          select: { id: true },
        }),
      );
    case "VERIFIED_SERVER_JOINED":
      return Boolean(
        await tx.userDailyActivity.findFirst({
          where: { userId, activityDate: questDate, verifiedServerJoined: true },
          select: { id: true },
        }),
      );
    case "DISCORD_JOIN":
      return false;
    case "FRIEND_REFERRAL":
      return Boolean(
        await tx.referralInvite.findFirst({
          where: { inviterId: userId, qualifiedAt: { not: null } },
          select: { id: true },
        }),
      );
    case "LOGIN_STREAK": {
      const rows = await tx.userDailyActivity.findMany({
        where: { userId, activityDate: { lte: new Date() } },
        select: {
          activityDate: true,
          webOpened: true,
          campaignPlayed: true,
          verifiedServerJoined: true,
        },
        orderBy: { activityDate: "asc" },
      });
      return calculateActivityStreak(rows).current >= target;
    }
    case "SPARKS_SHOP_PURCHASED":
      return Boolean(
        await tx.cosmeticPurchase.findFirst({ where: { userId }, select: { id: true } }),
      );
    case "SERVER_REVIEW_WRITTEN":
      return Boolean(
        await tx.review.findFirst({ where: { playerId: userId }, select: { id: true } }),
      );
    default:
      return false;
  }
}

export class QuestService {
  async evaluateAndAward(userId: string) {
    return prisma.$transaction(
      async (tx) => {
        const result = await this.evaluateUser(tx, userId);
        const inviterId = await reconcileReferredUser(tx, userId);
        if (inviterId) await this.evaluateUser(tx, inviterId);
        return result;
      },
      { isolationLevel: "Serializable" },
    );
  }

  private async evaluateUser(tx: QuestTransaction, userId: string) {
    const quests = await tx.dailyQuest.findMany({
      where: { active: true },
      orderBy: { title: "asc" },
    });
    const result = [];
    for (const quest of quests) {
      const questDate = questDateForCadence(quest.cadence);
      const complete = await isQuestComplete(tx, userId, quest.type, questDate, quest.target);
      const current = await tx.userQuest.upsert({
        where: {
          userId_questId_questDate: { userId, questId: quest.id, questDate },
        },
        create: {
          userId,
          questId: quest.id,
          questDate,
          progress: complete ? quest.target : 0,
        },
        update: { progress: complete ? quest.target : undefined },
        select: { id: true, progress: true, completedAt: true },
      });
      let completedAt = current.completedAt;
      if (complete && !completedAt) {
        completedAt = new Date();
        await tx.userQuest.update({
          where: { id: current.id },
          data: { progress: quest.target, completedAt },
        });
        const rewardKey =
          quest.cadence === "DAILY"
            ? `quest:${userId}:${quest.slug}:${questDate.toISOString().slice(0, 10)}`
            : `quest:${userId}:${quest.slug}`;
        await tx.sparksLedgerEntry.upsert({
          where: { idempotencyKey: rewardKey },
          update: {},
          create: {
            userId,
            direction: "CREDIT",
            amount: quest.sparksReward,
            transactionType: "DAILY_QUEST",
            referenceType: "QUEST",
            referenceId: quest.id,
            idempotencyKey: rewardKey,
            internalNote:
              quest.cadence === "DAILY"
                ? "Backend-verified recurring daily quest reward."
                : "Backend-verified account quest reward.",
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
  }

  async ensureAccountQuests(userId: string) {
    return this.evaluateAndAward(userId);
  }
}
