import { prisma, type Prisma } from "@nortix/database";
import type { CampaignInput } from "@nortix/shared";
import { allowsPlayerMilestoneSubmission } from "../../security/policies.js";

export class CampaignService {
  async create(ownerId: string, input: CampaignInput) {
    const server = await prisma.server.findFirst({ where: { id: input.serverId, ownerId } });
    if (!server) throw new Error("You can only create campaigns for servers you own.");

    const publicRewardCents = input.milestones.reduce(
      (sum, milestone) => sum + milestone.rewardCents,
      0,
    );
    return prisma.campaign.create({
      data: {
        serverId: input.serverId,
        ownerId,
        title: input.title,
        description: input.description,
        category: input.category,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        maxParticipants: input.maxParticipants,
        completionLimit: input.maxParticipants,
        internalBudgetCents: publicRewardCents * input.maxParticipants,
        publicRewardCents,
        regionRestrictions: input.regionRestrictions,
        versionRequirements: input.versionRequirements,
        eligibilityRules: { onePerUser: true },
        milestones: {
          create: input.milestones.map((milestone, index) => ({
            templateType: milestone.templateType,
            title: milestone.title,
            publicInstructions: milestone.instructions,
            verificationConfig: milestone.config as Prisma.InputJsonValue,
            completionRequirements: milestone.config as Prisma.InputJsonValue,
            order: index + 1,
            publicRewardCents: milestone.rewardCents,
            sparksReward: milestone.sparksReward,
            verificationMethod: milestone.verificationMethod,
            reviewRequired: milestone.verificationMethod === "MANUAL",
          })),
        },
      },
      include: { server: true, milestones: true },
    });
  }

  async submit(ownerId: string, campaignId: string) {
    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, ownerId },
      include: { milestones: true, server: true },
    });
    if (!campaign) throw new Error("Campaign not found.");
    if (campaign.status !== "DRAFT" && campaign.status !== "CHANGES_REQUESTED") {
      throw new Error("Only draft campaigns or campaigns with requested changes can be submitted.");
    }
    if (campaign.server.verificationStatus !== "VERIFIED") {
      throw new Error("Server ownership must be verified before campaign submission.");
    }
    if (campaign.milestones.length === 0)
      throw new Error("A campaign needs at least one milestone.");
    return prisma.$transaction(async (tx) => {
      const updated = await tx.campaign.update({
        where: { id: campaignId },
        data: { status: "SUBMITTED" },
      });
      await tx.auditLog.create({
        data: {
          actorId: ownerId,
          action: "CAMPAIGN_SUBMITTED",
          entityType: "CAMPAIGN",
          entityId: campaignId,
          beforeSnapshot: { status: campaign.status },
          afterSnapshot: { status: "SUBMITTED" },
        },
      });
      return updated;
    });
  }

  async join(
    playerId: string,
    campaignId: string,
    minecraftIdentityId?: string,
    crackedAccountLinkId?: string,
  ) {
    return prisma.$transaction(async (tx) => {
      const campaign = await tx.campaign.findFirst({
        where: {
          id: campaignId,
          status: "ACTIVE",
          startsAt: { lte: new Date() },
          endsAt: { gt: new Date() },
          server: { publicListing: true, moderationStatus: "APPROVED" },
        },
        include: {
          _count: { select: { participations: true } },
          milestones: { select: { verificationMethod: true } },
        },
      });
      if (!campaign) throw new Error("This campaign is not currently available.");
      if (campaign._count.participations >= campaign.maxParticipants) {
        throw new Error("This campaign is full.");
      }
      const needsVerifiedIdentity = campaign.milestones.some(
        (milestone) =>
          milestone.verificationMethod === "SERVER_PLUGIN" ||
          milestone.verificationMethod === "API",
      );
      const identity = minecraftIdentityId
        ? await tx.minecraftIdentity.findFirst({
            where: { id: minecraftIdentityId, userId: playerId, verified: true },
            select: { id: true },
          })
        : needsVerifiedIdentity
          ? await tx.minecraftIdentity.findFirst({
              where: { userId: playerId, verified: true },
              select: { id: true },
              orderBy: { createdAt: "asc" },
            })
          : null;
      const crackedLink = crackedAccountLinkId
        ? await tx.crackedAccountLink.findFirst({
            where: {
              id: crackedAccountLinkId,
              userId: playerId,
              serverId: campaign.serverId,
              status: "ACTIVE",
            },
            select: { id: true },
          })
        : needsVerifiedIdentity && !identity
          ? await tx.crackedAccountLink.findFirst({
              where: {
                userId: playerId,
                serverId: campaign.serverId,
                status: "ACTIVE",
              },
              select: { id: true },
              orderBy: { activatedAt: "desc" },
            })
          : null;
      if (minecraftIdentityId && !identity) {
        throw new Error("The selected verified Minecraft identity does not belong to this account.");
      }
      if (crackedAccountLinkId && !crackedLink) {
        throw new Error("The server-scoped Minecraft account link is not active for this campaign.");
      }
      if (needsVerifiedIdentity && !identity && !crackedLink) {
        throw new Error("A verified premium identity or active server account link is required.");
      }
      const participation = await tx.campaignParticipation.upsert({
        where: { playerId_campaignId: { playerId, campaignId } },
        update: {
          lastActivityAt: new Date(),
          minecraftIdentityId: identity?.id ?? null,
          crackedAccountLinkId: crackedLink?.id ?? null,
        },
        create: {
          playerId,
          campaignId,
          minecraftIdentityId: identity?.id,
          crackedAccountLinkId: crackedLink?.id,
          eligibilitySnapshot: { capturedAt: new Date().toISOString() },
        },
        select: {
          id: true,
          playerId: true,
          campaignId: true,
          minecraftIdentityId: true,
          status: true,
          joinedAt: true,
          lastActivityAt: true,
          campaign: {
            select: {
              id: true,
              title: true,
              description: true,
              status: true,
              category: true,
              startsAt: true,
              endsAt: true,
              server: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  logoUrl: true,
                  online: true,
                },
              },
              milestones: {
                select: {
                  id: true,
                  templateType: true,
                  title: true,
                  publicInstructions: true,
                  order: true,
                  sparksReward: true,
                  verificationMethod: true,
                },
                orderBy: { order: "asc" },
              },
            },
          },
        },
      });
      await tx.analyticsEvent.upsert({
        where: { id: `join:${participation.id}` },
        update: {},
        create: {
          id: `join:${participation.id}`,
          userId: playerId,
          serverId: campaign.serverId,
          campaignId,
          participationId: participation.id,
          source: "WEB",
          type: "CAMPAIGN_JOIN",
          occurredAt: new Date(),
          metadata: {},
        },
      });
      return participation;
    }, { isolationLevel: "Serializable" });
  }

  async submitMilestone(
    playerId: string,
    participationId: string,
    milestoneId: string,
    evidence: object,
  ) {
    const participation = await prisma.campaignParticipation.findFirst({
      where: { id: participationId, playerId },
      include: { campaign: { include: { milestones: true } } },
    });
    if (!participation) throw new Error("Participation not found.");
    const milestone = participation.campaign.milestones.find(
      (item) => item.id === milestoneId,
    );
    if (!milestone) {
      throw new Error("Milestone does not belong to this campaign.");
    }
    if (!allowsPlayerMilestoneSubmission(milestone.verificationMethod)) {
      throw new Error(
        "This milestone can only be progressed by backend-validated integration evidence.",
      );
    }
    return prisma.milestoneCompletion.upsert({
      where: { participationId_milestoneId: { participationId, milestoneId } },
      update: {},
      create: {
        participationId,
        milestoneId,
        evidence,
        verificationSource: "PLAYER_SUBMISSION",
        status: "PENDING",
      },
    });
  }

  async reviewCompletion(
    reviewerId: string,
    completionId: string,
    approved: boolean,
    reason?: string,
  ) {
    return prisma.$transaction(async (tx) => {
      const completion = await tx.milestoneCompletion.findUnique({
        where: { id: completionId },
        include: {
          participation: true,
          milestone: { include: { campaign: { select: { status: true } } } },
        },
      });
      if (!completion) throw new Error("Completion not found.");
      if (completion.status === "VERIFIED") return completion;
      if (completion.status === "REJECTED")
        throw new Error("Rejected completions require a dispute workflow.");
      if (!["ACTIVE", "COMPLETED"].includes(completion.milestone.campaign.status)) {
        throw new Error("Rewards cannot be approved for an inactive campaign.");
      }
      if (completion.verificationSource === "SERVER_PLUGIN") {
        const evidence = completion.evidence as Record<string, unknown>;
        if (evidence.backendCalculated !== true) {
          throw new Error("Plugin evidence must be calculated by the backend before review.");
        }
      }

      if (!approved) {
        return tx.milestoneCompletion.update({
          where: { id: completionId },
          data: {
            status: "REJECTED",
            reviewedById: reviewerId,
            reviewedAt: new Date(),
            rejectionReason: reason,
          },
        });
      }

      const reward = await tx.earningsLedgerEntry.upsert({
        where: { idempotencyKey: `completion:${completionId}:earnings` },
        update: {},
        create: {
          userId: completion.participation.playerId,
          direction: "CREDIT",
          amountCents: completion.milestone.publicRewardCents,
          currency: "USD",
          transactionType: "MILESTONE_REWARD",
          referenceType: "MILESTONE_COMPLETION",
          referenceId: completionId,
          idempotencyKey: `completion:${completionId}:earnings`,
          createdById: reviewerId,
        },
      });
      const sparks = await tx.sparksLedgerEntry.upsert({
        where: { idempotencyKey: `completion:${completionId}:sparks` },
        update: {},
        create: {
          userId: completion.participation.playerId,
          direction: "CREDIT",
          amount: completion.milestone.sparksReward,
          transactionType: "CAMPAIGN_REWARD",
          referenceType: "MILESTONE_COMPLETION",
          referenceId: completionId,
          idempotencyKey: `completion:${completionId}:sparks`,
          createdById: reviewerId,
        },
      });
      const updated = await tx.milestoneCompletion.update({
        where: { id: completionId },
        data: {
          status: "VERIFIED",
          reviewedById: reviewerId,
          reviewedAt: new Date(),
          rewardTransactionId: reward.id,
          sparksTransactionId: sparks.id,
        },
      });
      const earningsAggregate = await tx.earningsLedgerEntry.groupBy({
        by: ["direction"],
        where: { userId: completion.participation.playerId, currency: "USD" },
        _sum: { amountCents: true },
      });
      const sparksAggregate = await tx.sparksLedgerEntry.groupBy({
        by: ["direction"],
        where: { userId: completion.participation.playerId },
        _sum: { amount: true },
      });
      const earnings = earningsAggregate.reduce(
        (total, group) =>
          total + (group.direction === "CREDIT" ? 1 : -1) * (group._sum.amountCents ?? 0),
        0,
      );
      const sparksBalance = sparksAggregate.reduce(
        (total, group) =>
          total + (group.direction === "CREDIT" ? 1 : -1) * (group._sum.amount ?? 0),
        0,
      );
      await tx.user.update({
        where: { id: completion.participation.playerId },
        data: { earningsBalanceCache: earnings, sparksBalanceCache: sparksBalance },
      });
      return updated;
    });
  }
}
