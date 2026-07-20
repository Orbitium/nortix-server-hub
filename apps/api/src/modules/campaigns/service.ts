import { prisma, type Prisma } from "@nortix/database";
import type { CampaignInput } from "@nortix/shared";
import { allowsPlayerMilestoneSubmission } from "../../security/policies.js";
import {
  allocateCampaignCreditBudget,
  calculateCampaignCreditBalance,
  deriveCampaignCapacity,
  CAMPAIGN_ACTIVITY_WINDOW_DAYS,
  evaluateCampaignEligibility,
  estimatePotentialExposure,
  validateMilestoneTarget,
} from "./policy.js";
import { createNotification } from "../notifications/service.js";

export class CampaignService {
  async create(ownerId: string, input: CampaignInput) {
    for (const milestone of input.milestones) {
      if (milestone.verificationMethod !== "SERVER_PLUGIN") continue;
      const metric = String(milestone.config.metric ?? milestone.templateType).toUpperCase();
      const target = Number(milestone.config.target);
      if (!validateMilestoneTarget(metric, target)) {
        throw new Error("A plugin milestone has an unsupported metric or unsafe target.");
      }
    }
    const baseReward = Math.floor(input.sparksRewardRange.maximum / input.milestones.length);
    const rewardRemainder = input.sparksRewardRange.maximum - baseReward * input.milestones.length;
    return prisma.$transaction(async (tx) => {
      const server = await tx.server.findFirst({
        where: { id: input.serverId, ownerId },
        select: { id: true, ownerId: true, playerCount: true },
      });
      if (!server) throw new Error("You can only create campaigns for servers you own.");
      const activitySince = new Date(Date.now() - CAMPAIGN_ACTIVITY_WINDOW_DAYS * 86_400_000);
      const activitySamples = await tx.serverActivitySample.findMany({
        where: { serverId: server.id, observedAt: { gte: activitySince } },
        select: { onlinePlayers: true, observedAt: true },
      });
      const eligibility = evaluateCampaignEligibility(activitySamples);
      if (!eligibility.eligible) {
        throw new Error(
          `This server is not campaign eligible. It needs at least ${eligibility.minimumAveragePlayers} average active players and a current plugin activity history.`,
        );
      }
      const entries = await tx.campaignCreditLedgerEntry.findMany({ where: { ownerId } });
      const creditBalance = calculateCampaignCreditBalance(entries);
      if (input.budgetCredits > creditBalance.total) {
        throw new Error("Campaign budget exceeds available Campaign Credits.");
      }
      const capacity = deriveCampaignCapacity({
        budgetCredits: input.budgetCredits,
        maximumSparksReward: input.sparksRewardRange.maximum,
        milestoneCount: input.milestones.length,
      });
      const exposure = estimatePotentialExposure(capacity.capacity, server.playerCount);
      return tx.campaign.create({
        data: {
          serverId: input.serverId,
          ownerId,
          title: input.title,
          description: input.description,
          category: input.category,
          startsAt: input.startsAt,
          endsAt: input.endsAt,
          maxParticipants: capacity.capacity,
          completionLimit: capacity.capacity,
          internalBudgetCents: 0,
          campaignBudgetCredits: input.budgetCredits,
          publicRewardCents: 0,
          minimumSparksReward: input.sparksRewardRange.minimum,
          maximumSparksReward: input.sparksRewardRange.maximum,
          potentialExposureMin: exposure.minimum,
          potentialExposureMax: exposure.maximum,
          automaticVerification: true,
          regionRestrictions: input.regionRestrictions,
          versionRequirements: input.versionRequirements,
          eligibilityRules: {
            onePerUser: true,
            rewardsArePotential: true,
            derivedCapacity: capacity.capacity,
            estimatedCostPerPotentialParticipant: capacity.costPerPotentialParticipant,
            exposureMethodology: exposure.methodology,
          },
          milestones: {
            create: input.milestones.map((milestone, index) => ({
              templateType: milestone.templateType,
              title: milestone.title,
              publicInstructions: milestone.instructions,
              verificationConfig: milestone.config as Prisma.InputJsonValue,
              completionRequirements: milestone.config as Prisma.InputJsonValue,
              order: index + 1,
              publicRewardCents: 0,
              sparksReward: baseReward + (index < rewardRemainder ? 1 : 0),
              verificationMethod: milestone.verificationMethod,
              reviewRequired: !["SERVER_PLUGIN", "WEB_EVENT", "API"].includes(milestone.verificationMethod),
            })),
          },
        },
        include: { server: true, milestones: true },
      });
    }, { isolationLevel: "Serializable" });
  }

  async submit(ownerId: string, campaignId: string) {
    return prisma.$transaction(async (tx) => {
      const campaign = await tx.campaign.findFirst({
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
      const activitySince = new Date(Date.now() - CAMPAIGN_ACTIVITY_WINDOW_DAYS * 86_400_000);
      const activitySamples = await tx.serverActivitySample.findMany({
        where: { serverId: campaign.serverId, observedAt: { gte: activitySince } },
        select: { onlinePlayers: true, observedAt: true },
      });
      const eligibility = evaluateCampaignEligibility(activitySamples);
      if (!eligibility.eligible) {
        throw new Error(
          `Campaign submission requires at least ${eligibility.minimumAveragePlayers} average active players and a current plugin activity history.`,
        );
      }
      if (campaign.milestones.length === 0) throw new Error("A campaign needs at least one milestone.");
      const entries = await tx.campaignCreditLedgerEntry.findMany({ where: { ownerId } });
      const balance = calculateCampaignCreditBalance(entries);
      const allocation = allocateCampaignCreditBudget(balance, campaign.campaignBudgetCredits);
      await tx.campaignCreditLedgerEntry.create({
        data: {
          ownerId,
          direction: "DEBIT",
          amountCents: campaign.campaignBudgetCredits,
          purchasedCents: allocation.purchased,
          promotionalCents: allocation.promotional,
          transactionType: "SPENT",
          referenceType: "CAMPAIGN_BUDGET",
          referenceId: campaign.id,
          idempotencyKey: `campaign-budget:${campaign.id}`,
          internalNote: "Campaign Credits reserved when the campaign was submitted.",
        },
      });
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
    }, { isolationLevel: "Serializable" });
  }

  async recordPluginMilestone(input: { participationId: string; milestoneId: string; evidence: Prisma.InputJsonObject; automaticallyApproved: boolean }) {
    return prisma.$transaction(
      async (tx) => {
        const milestone = await tx.campaignMilestone.findUnique({
          where: { id: input.milestoneId },
          include: {
            campaign: { select: { status: true, automaticVerification: true } },
          },
        });
        if (!milestone) throw new Error("Campaign milestone not found.");
        const participation = await tx.campaignParticipation.findUnique({
          where: { id: input.participationId },
          select: { id: true, playerId: true, campaignId: true },
        });
        if (!participation || participation.campaignId !== milestone.campaignId) {
          throw new Error("Milestone does not belong to the participation.");
        }
        const existing = await tx.milestoneCompletion.findUnique({
          where: {
            participationId_milestoneId: {
              participationId: participation.id,
              milestoneId: milestone.id,
            },
          },
        });
        if (existing?.status === "VERIFIED" || existing?.status === "REJECTED") {
          return existing;
        }
        const completion = await tx.milestoneCompletion.upsert({
          where: {
            participationId_milestoneId: {
              participationId: participation.id,
              milestoneId: milestone.id,
            },
          },
          update: {
            evidence: input.evidence,
            verificationSource: "SERVER_PLUGIN",
          },
          create: {
            participationId: participation.id,
            milestoneId: milestone.id,
            evidence: input.evidence,
            verificationSource: "SERVER_PLUGIN",
            status: "PENDING",
          },
        });
        const mayApprove = input.automaticallyApproved && milestone.campaign.automaticVerification && milestone.campaign.status === "ACTIVE" && milestone.verificationMethod === "SERVER_PLUGIN" && !milestone.reviewRequired;
        if (!mayApprove) return completion;

        const sparks = await tx.sparksLedgerEntry.upsert({
          where: { idempotencyKey: `completion:${completion.id}:sparks` },
          update: {},
          create: {
            userId: participation.playerId,
            direction: "CREDIT",
            amount: milestone.sparksReward,
            transactionType: "CAMPAIGN_REWARD",
            referenceType: "MILESTONE_COMPLETION",
            referenceId: completion.id,
            idempotencyKey: `completion:${completion.id}:sparks`,
            internalNote: "Automatically approved from backend-aggregated plugin evidence.",
          },
        });
        const updated = await tx.milestoneCompletion.update({
          where: { id: completion.id },
          data: {
            status: "VERIFIED",
            reviewedAt: new Date(),
            sparksTransactionId: sparks.id,
          },
        });
        const sparksAggregate = await tx.sparksLedgerEntry.groupBy({
          by: ["direction"],
          where: { userId: participation.playerId },
          _sum: { amount: true },
        });
        const sparksBalance = sparksAggregate.reduce((total, group) => total + (group.direction === "CREDIT" ? 1 : -1) * (group._sum.amount ?? 0), 0);
        await tx.user.update({
          where: { id: participation.playerId },
          data: { sparksBalanceCache: sparksBalance },
        });
        await tx.auditLog.create({
          data: {
            action: "MILESTONE_AUTO_VERIFIED",
            entityType: "MILESTONE_COMPLETION",
            entityId: completion.id,
            beforeSnapshot: { status: completion.status },
            afterSnapshot: {
              status: "VERIFIED",
              verificationSource: "SERVER_PLUGIN",
              sparks: milestone.sparksReward,
            },
            reason: "Backend safeguards accepted aggregated plugin evidence.",
          },
        });
        return updated;
      },
      { isolationLevel: "Serializable" },
    );
  }

  async join(playerId: string, campaignId: string, minecraftIdentityId?: string, crackedAccountLinkId?: string) {
    return prisma.$transaction(
      async (tx) => {
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
        const needsVerifiedIdentity = campaign.milestones.some((milestone) => milestone.verificationMethod === "SERVER_PLUGIN" || milestone.verificationMethod === "API");
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
        await createNotification(tx, {
          recipientId: playerId,
          category: "CAMPAIGN",
          title: `Joined ${campaign.title}`,
          body: `Your progress is ready. Eligible activity may receive up to ${campaign.maximumSparksReward} Sparks after backend verification.`,
          actionUrl: `/campaigns/${campaign.id}`,
          dedupeKey: `campaign-joined:${participation.id}`,
        });
        return participation;
      },
      { isolationLevel: "Serializable" },
    );
  }

  async submitMilestone(playerId: string, participationId: string, milestoneId: string, evidence: object) {
    const participation = await prisma.campaignParticipation.findFirst({
      where: { id: participationId, playerId },
      include: { campaign: { include: { milestones: true } } },
    });
    if (!participation) throw new Error("Participation not found.");
    const milestone = participation.campaign.milestones.find((item) => item.id === milestoneId);
    if (!milestone) {
      throw new Error("Milestone does not belong to this campaign.");
    }
    if (!allowsPlayerMilestoneSubmission(milestone.verificationMethod)) {
      throw new Error("This milestone can only be progressed by backend-validated integration evidence.");
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

  async reviewCompletion(reviewerId: string, completionId: string, approved: boolean, reason?: string) {
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
      if (completion.status === "REJECTED") throw new Error("Rejected completions require a dispute workflow.");
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
          sparksTransactionId: sparks.id,
        },
      });
      const sparksAggregate = await tx.sparksLedgerEntry.groupBy({
        by: ["direction"],
        where: { userId: completion.participation.playerId },
        _sum: { amount: true },
      });
      const sparksBalance = sparksAggregate.reduce((total, group) => total + (group.direction === "CREDIT" ? 1 : -1) * (group._sum.amount ?? 0), 0);
      await tx.user.update({
        where: { id: completion.participation.playerId },
        data: { sparksBalanceCache: sparksBalance },
      });
      return updated;
    });
  }
}
