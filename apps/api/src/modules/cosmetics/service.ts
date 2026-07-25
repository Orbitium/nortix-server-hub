import { CompletionStatus, prisma, Prisma, type CosmeticType } from "@nortix/database";
import { isCosmeticUnlocked, normalizeCosmeticPreview } from "./policy.js";
import { createNotification } from "../notifications/service.js";
import { testerExperienceForLevel } from "./progression.js";

const cosmeticSelect = {
  id: true,
  slug: true,
  name: true,
  description: true,
  type: true,
  unlockMethod: true,
  requiredLevel: true,
  sparksPrice: true,
  rarity: true,
  season: true,
  preview: true,
  sortOrder: true,
  available: true,
} as const;

export class CosmeticService {
  async collection(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        testerLevel: true,
        testerExperience: true,
        reputationScore: true,
        cosmeticPurchases: { select: { itemId: true } },
        equippedCosmetics: { select: { type: true, itemId: true } },
      },
    });
    if (!user) throw new Error("Profile not found.");

    const purchasedIds = new Set(user.cosmeticPurchases.map((purchase) => purchase.itemId));
    const equippedIds = new Set(user.equippedCosmetics.map((selection) => selection.itemId));
    const items = await prisma.cosmeticItem.findMany({
      where: {
        OR: [
          { available: true },
          ...(purchasedIds.size > 0 ? [{ id: { in: [...purchasedIds] } }] : []),
          ...(equippedIds.size > 0 ? [{ id: { in: [...equippedIds] } }] : []),
        ],
      },
      select: cosmeticSelect,
      orderBy: [{ type: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    });

    const catalog = items.map((item) => {
      const purchased = purchasedIds.has(item.id);
      return {
        ...item,
        preview: normalizeCosmeticPreview(item.preview),
        purchased,
        unlocked: isCosmeticUnlocked({
          unlockMethod: item.unlockMethod,
          requiredLevel: item.requiredLevel,
          testerLevel: user.testerLevel,
          purchased,
        }),
        equipped: equippedIds.has(item.id),
      };
    });
    const nextLevelUnlock =
      catalog
        .filter(
          (item) =>
            item.unlockMethod === "LEVEL" &&
            item.requiredLevel !== null &&
            item.requiredLevel > user.testerLevel,
        )
        .sort((left, right) => left.requiredLevel! - right.requiredLevel!)[0] ?? null;

    return {
      testerLevel: user.testerLevel,
      testerExperience: user.testerExperience,
      currentLevelExperience: testerExperienceForLevel(user.testerLevel),
      nextLevelExperience: testerExperienceForLevel(user.testerLevel + 1),
      reputationScore: user.reputationScore,
      nextLevelUnlock: nextLevelUnlock
        ? {
            level: nextLevelUnlock.requiredLevel!,
            name: nextLevelUnlock.name,
            itemId: nextLevelUnlock.id,
          }
        : null,
      equipped: Object.fromEntries(
        user.equippedCosmetics.map((selection) => [selection.type, selection.itemId]),
      ),
      items: catalog,
    };
  }

  async activity(userId: string) {
    const [
      participations,
      sparks,
      participationCount,
      verifiedPlaytests,
      feedbackCount,
      identities,
    ] = await Promise.all([
      prisma.campaignParticipation.findMany({
        where: { playerId: userId },
        select: {
          id: true,
          status: true,
          joinedAt: true,
          lastActivityAt: true,
          campaign: { select: { title: true, server: { select: { name: true } } } },
          completions: {
            where: { status: CompletionStatus.VERIFIED },
            select: {
              id: true,
              reviewedAt: true,
              submittedAt: true,
              milestone: { select: { title: true, sparksReward: true } },
            },
            orderBy: { submittedAt: "desc" },
            take: 3,
          },
          feedback: { select: { createdAt: true } },
        },
        orderBy: { lastActivityAt: "desc" },
        take: 8,
      }),
      prisma.sparksLedgerEntry.findMany({
        where: { userId, direction: "CREDIT" },
        select: { id: true, amount: true, transactionType: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.campaignParticipation.count({ where: { playerId: userId } }),
      prisma.campaignParticipation.count({
        where: {
          playerId: userId,
          completions: { some: { status: CompletionStatus.VERIFIED } },
        },
      }),
      prisma.feedbackResponse.count({ where: { participation: { playerId: userId } } }),
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          _count: {
            select: { minecraftIdentities: true, crackedAccountLinks: true },
          },
        },
      }),
    ]);

    const activities = [
      ...participations.flatMap((participation) => [
        ...participation.completions.map((completion) => ({
          id: `completion:${completion.id}`,
          kind: "PLAYTEST" as const,
          title: completion.milestone.title,
          detail: `${participation.campaign.server.name} · verified`,
          occurredAt: (completion.reviewedAt ?? completion.submittedAt).toISOString(),
          sparks: completion.milestone.sparksReward,
        })),
        ...(participation.feedback
          ? [
              {
                id: `feedback:${participation.id}`,
                kind: "FEEDBACK" as const,
                title: `Feedback submitted for ${participation.campaign.title}`,
                detail: participation.campaign.server.name,
                occurredAt: participation.feedback.createdAt.toISOString(),
                sparks: null,
              },
            ]
          : []),
        {
          id: `joined:${participation.id}`,
          kind: "JOINED" as const,
          title: `Joined ${participation.campaign.title}`,
          detail: participation.campaign.server.name,
          occurredAt: participation.joinedAt.toISOString(),
          sparks: null,
        },
      ]),
      ...sparks
        .filter((entry) => entry.transactionType !== "CAMPAIGN_REWARD")
        .map((entry) => ({
          id: `sparks:${entry.id}`,
          kind: "SPARKS" as const,
          title: "Sparks added",
          detail: entry.transactionType.replaceAll("_", " ").toLowerCase(),
          occurredAt: entry.createdAt.toISOString(),
          sparks: entry.amount,
        })),
    ]
      .sort((left, right) => Date.parse(right.occurredAt) - Date.parse(left.occurredAt))
      .slice(0, 8);

    return {
      stats: {
        verifiedPlaytests,
        participationRecords: participationCount,
        premiumIdentities: identities?._count.minecraftIdentities ?? 0,
        serverScopedIdentities: identities?._count.crackedAccountLinks ?? 0,
        feedbackGiven: feedbackCount,
      },
      activities,
    };
  }

  async purchase(userId: string, itemId: string) {
    return prisma.$transaction(
      async (tx) => {
        const [item, existing, balance] = await Promise.all([
          tx.cosmeticItem.findUnique({ where: { id: itemId }, select: cosmeticSelect }),
          tx.cosmeticPurchase.findUnique({
            where: { userId_itemId: { userId, itemId } },
            select: { id: true, itemId: true, createdAt: true },
          }),
          tx.sparksLedgerEntry.groupBy({
            by: ["direction"],
            where: { userId },
            _sum: { amount: true },
          }),
        ]);
        if (existing) return existing;
        if (!item?.available || item.unlockMethod !== "SPARKS") {
          throw new Error("This cosmetic cannot be purchased.");
        }
        const availableSparks = balance.reduce(
          (total, row) =>
            total + (row.direction === "CREDIT" ? (row._sum.amount ?? 0) : -(row._sum.amount ?? 0)),
          0,
        );
        if (availableSparks < item.sparksPrice) throw new Error("Not enough Sparks.");
        const ledger = await tx.sparksLedgerEntry.create({
          data: {
            userId,
            direction: "DEBIT",
            amount: item.sparksPrice,
            transactionType: "COSMETIC_PURCHASE",
            referenceType: "COSMETIC_ITEM",
            referenceId: item.id,
            idempotencyKey: `cosmetic:${userId}:${item.id}`,
          },
        });
        const purchase = await tx.cosmeticPurchase.create({
          data: { userId, itemId: item.id, sparksLedgerEntryId: ledger.id },
          select: { id: true, itemId: true, createdAt: true },
        });
        await createNotification(tx, {
          recipientId: userId,
          category: "SPARKS",
          title: `${item.name} unlocked`,
          body: `${item.sparksPrice.toLocaleString()} Sparks were used. Sparks have no cash value.`,
          actionUrl: "/dashboard/profile",
          dedupeKey: `cosmetic-purchase:${purchase.id}`,
        });
        return purchase;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async equip(userId: string, itemId: string) {
    return prisma.$transaction(async (tx) => {
      const [user, item, purchase] = await Promise.all([
        tx.user.findUnique({ where: { id: userId }, select: { testerLevel: true } }),
        tx.cosmeticItem.findUnique({ where: { id: itemId }, select: cosmeticSelect }),
        tx.cosmeticPurchase.findUnique({
          where: { userId_itemId: { userId, itemId } },
          select: { id: true },
        }),
      ]);
      if (!user || !item) throw new Error("Cosmetic not found.");
      if (!item.available && !purchase) throw new Error("Cosmetic not found.");
      if (
        !isCosmeticUnlocked({
          unlockMethod: item.unlockMethod,
          requiredLevel: item.requiredLevel,
          testerLevel: user.testerLevel,
          purchased: Boolean(purchase),
        })
      ) {
        throw new Error("Unlock this cosmetic before equipping it.");
      }
      return tx.equippedCosmetic.upsert({
        where: { userId_type: { userId, type: item.type } },
        create: { userId, type: item.type, itemId: item.id },
        update: { itemId: item.id, equippedAt: new Date() },
        select: { type: true, itemId: true, equippedAt: true },
      });
    });
  }

  async unequip(userId: string, type: CosmeticType) {
    await prisma.equippedCosmetic.deleteMany({ where: { userId, type } });
  }
}
