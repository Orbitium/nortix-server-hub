import { prisma } from "@nortix/database";
import type {
  AdminServerStatusAction,
  AdminUserStatusAction,
} from "@nortix/shared";

const sparksBalance = (
  rows: Array<{ direction: "CREDIT" | "DEBIT"; _sum: { amount: number | null } }>,
) =>
  rows.reduce(
    (total, row) =>
      total + (row.direction === "CREDIT" ? (row._sum.amount ?? 0) : -(row._sum.amount ?? 0)),
    0,
  );

const userStatusFor = {
  ACTIVATE: "ACTIVE",
  FREEZE: "LIMITED",
  UNDER_REVIEW: "UNDER_REVIEW",
  SUSPEND: "SUSPENDED",
  BAN: "BANNED",
} as const satisfies Record<AdminUserStatusAction["action"], string>;

const serverStatusFor = {
  APPROVE: "APPROVED",
  FLAG: "FLAGGED",
  HIDE: "HIDDEN",
  REJECT: "REJECTED",
  RESTORE: "APPROVED",
} as const satisfies Record<AdminServerStatusAction["action"], string>;

export class AdminEntityService {
  async userReport(userId: string) {
    const [user, balanceRows, audit] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          displayName: true,
          email: true,
          avatarUrl: true,
          roles: true,
          status: true,
          countryCode: true,
          preferredCurrency: true,
          publicProfile: true,
          moderationState: true,
          reputationScore: true,
          reputationTier: true,
          testerLevel: true,
          testerExperience: true,
          createdAt: true,
          lastActiveAt: true,
          minecraftIdentities: {
            select: {
              id: true,
              uuid: true,
              username: true,
              lastKnownUsername: true,
              verified: true,
              verificationMethod: true,
              createdAt: true,
            },
            orderBy: { createdAt: "desc" },
          },
          crackedAccountLinks: {
            select: {
              id: true,
              minecraftUsername: true,
              status: true,
              reservedAt: true,
              expiresAt: true,
              activatedAt: true,
              releasedAt: true,
              releaseReason: true,
              server: { select: { id: true, name: true, slug: true } },
            },
            orderBy: { reservedAt: "desc" },
            take: 50,
          },
          ownedServers: {
            select: {
              id: true,
              name: true,
              slug: true,
              moderationStatus: true,
              verificationStatus: true,
              publicListing: true,
            },
            orderBy: { updatedAt: "desc" },
          },
          serverMemberships: {
            select: {
              id: true,
              role: true,
              acceptedAt: true,
              server: { select: { id: true, name: true, slug: true } },
            },
            orderBy: { acceptedAt: "desc" },
          },
          participations: {
            select: {
              id: true,
              status: true,
              joinedAt: true,
              lastActivityAt: true,
              campaign: {
                select: {
                  id: true,
                  title: true,
                  server: { select: { id: true, name: true, slug: true } },
                },
              },
              _count: { select: { completions: true } },
            },
            orderBy: { lastActivityAt: "desc" },
            take: 100,
          },
          sparksLedger: {
            select: {
              id: true,
              direction: true,
              amount: true,
              transactionType: true,
              referenceType: true,
              referenceId: true,
              internalNote: true,
              createdAt: true,
              createdBy: { select: { username: true, displayName: true } },
            },
            orderBy: { createdAt: "desc" },
            take: 100,
          },
          minecraftIdentityActivity: {
            select: {
              id: true,
              type: true,
              identityKind: true,
              minecraftUuid: true,
              minecraftUsername: true,
              metadata: true,
              createdAt: true,
              server: { select: { id: true, name: true, slug: true } },
            },
            orderBy: { createdAt: "desc" },
            take: 100,
          },
          _count: {
            select: {
              participations: true,
              reviews: true,
              serverVotes: true,
              sponsoredPurchases: true,
              serverStorePurchasesBought: true,
              serverStorePurchasesReceived: true,
              notifications: true,
              referralInvites: true,
              fraudFlags: true,
              moderationCases: true,
            },
          },
        },
      }),
      prisma.sparksLedgerEntry.groupBy({
        by: ["direction"],
        where: { userId },
        _sum: { amount: true },
      }),
      prisma.auditLog.findMany({
        where: { entityType: "USER", entityId: userId },
        select: {
          id: true,
          action: true,
          reason: true,
          beforeSnapshot: true,
          afterSnapshot: true,
          createdAt: true,
          actor: { select: { username: true, displayName: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    ]);
    if (!user) return null;
    return { ...user, sparksBalance: sparksBalance(balanceRows), audit };
  }

  async serverReport(serverId: string) {
    const [server, audit] = await Promise.all([
      prisma.server.findUnique({
        where: { id: serverId },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          hostname: true,
          port: true,
          versions: true,
          edition: true,
          categories: true,
          tags: true,
          logoUrl: true,
          bannerUrl: true,
          screenshotUrls: true,
          discordUrl: true,
          websiteUrl: true,
          verificationStatus: true,
          verificationScope: true,
          verificationParentId: true,
          moderationStatus: true,
          claimed: true,
          online: true,
          publicListing: true,
          rewardedVotingEnabled: true,
          playerCount: true,
          maxPlayers: true,
          pluginCapabilities: true,
          pluginLastSeenAt: true,
          playerHistorySyncedAt: true,
          createdAt: true,
          updatedAt: true,
          owner: {
            select: {
              id: true,
              username: true,
              displayName: true,
              email: true,
              status: true,
            },
          },
          verificationParent: { select: { id: true, name: true, slug: true } },
          networkServers: {
            select: {
              id: true,
              name: true,
              slug: true,
              moderationStatus: true,
              verificationStatus: true,
            },
          },
          verifications: {
            select: {
              id: true,
              provider: true,
              status: true,
              reviewedBy: true,
              reviewNote: true,
              expiresAt: true,
              createdAt: true,
              updatedAt: true,
            },
            orderBy: { createdAt: "desc" },
            take: 25,
          },
          teamMembers: {
            select: {
              id: true,
              role: true,
              acceptedAt: true,
              user: {
                select: { id: true, username: true, displayName: true, status: true },
              },
            },
            orderBy: { acceptedAt: "asc" },
          },
          campaigns: {
            select: {
              id: true,
              title: true,
              status: true,
              startsAt: true,
              endsAt: true,
              maximumSparksReward: true,
              _count: { select: { participations: true } },
            },
            orderBy: { createdAt: "desc" },
            take: 100,
          },
          activitySamples: {
            select: {
              id: true,
              observedAt: true,
              receivedAt: true,
              onlinePlayers: true,
              maxPlayers: true,
              platform: true,
              pluginVersion: true,
              serverVersion: true,
              backendCounts: true,
            },
            orderBy: { observedAt: "desc" },
            take: 100,
          },
          integrationKeys: {
            select: {
              id: true,
              name: true,
              algorithm: true,
              scopes: true,
              lastFour: true,
              createdAt: true,
              lastUsedAt: true,
              revokedAt: true,
            },
            orderBy: { createdAt: "desc" },
          },
          store: {
            select: {
              id: true,
              name: true,
              available: true,
              createdAt: true,
              updatedAt: true,
              _count: { select: { items: true } },
            },
          },
          _count: {
            select: {
              campaigns: true,
              reviews: true,
              votes: true,
              analyticsEvents: true,
              teamMembers: true,
              playerPresences: true,
              activitySamples: true,
            },
          },
        },
      }),
      prisma.auditLog.findMany({
        where: { entityType: "SERVER", entityId: serverId },
        select: {
          id: true,
          action: true,
          reason: true,
          beforeSnapshot: true,
          afterSnapshot: true,
          createdAt: true,
          actor: { select: { username: true, displayName: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    ]);
    return server ? { ...server, audit } : null;
  }

  async updateUserStatus(
    actorId: string,
    userId: string,
    input: AdminUserStatusAction,
    requestId: string,
  ) {
    return prisma.$transaction(async (tx) => {
      const before = await tx.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          displayName: true,
          roles: true,
          status: true,
          moderationState: true,
        },
      });
      if (!before) throw new Error("User account not found.");
      if (before.id === actorId) throw new Error("You cannot restrict your own admin account.");
      if (before.roles.includes("ADMIN") || before.roles.includes("MODERATOR")) {
        throw new Error("Staff account status must be managed through Nortix staff access.");
      }
      if (input.confirmation !== before.id) {
        throw new Error("The user account confirmation does not match.");
      }
      const status = userStatusFor[input.action];
      const moderationState =
        before.moderationState &&
        typeof before.moderationState === "object" &&
        !Array.isArray(before.moderationState)
          ? before.moderationState
          : {};
      const updated = await tx.user.update({
        where: { id: before.id },
        data: {
          status,
          moderationState: {
            ...moderationState,
            latestAction: input.action,
            reason: input.reason,
            actorId,
            updatedAt: new Date().toISOString(),
          },
        },
        select: { id: true, username: true, displayName: true, roles: true, status: true },
      });
      await Promise.all([
        tx.auditLog.create({
          data: {
            actorId,
            action: `USER_STATUS_${input.action}`,
            entityType: "USER",
            entityId: before.id,
            beforeSnapshot: { status: before.status },
            afterSnapshot: { status: updated.status },
            reason: input.reason,
            requestId,
          },
        }),
        tx.notification.create({
          data: {
            recipientId: before.id,
            category: "SECURITY",
            title: "Account access updated",
            body: input.reason,
            actionUrl: "/dashboard/settings",
            dedupeKey: `user-status:${requestId}`,
          },
        }),
      ]);
      return updated;
    });
  }

  async updateServerStatus(
    actorId: string,
    serverId: string,
    input: AdminServerStatusAction,
    requestId: string,
  ) {
    return prisma.$transaction(async (tx) => {
      const before = await tx.server.findUnique({
        where: { id: serverId },
        select: {
          id: true,
          name: true,
          ownerId: true,
          moderationStatus: true,
          publicListing: true,
        },
      });
      if (!before) throw new Error("Server not found.");
      if (input.confirmation !== before.id) {
        throw new Error("The server confirmation does not match.");
      }
      const moderationStatus = serverStatusFor[input.action];
      const hidesListing = input.action === "HIDE" || input.action === "REJECT";
      const updated = await tx.server.update({
        where: { id: before.id },
        data: {
          moderationStatus,
          ...(hidesListing ? { publicListing: false } : {}),
        },
        select: {
          id: true,
          name: true,
          moderationStatus: true,
          publicListing: true,
          updatedAt: true,
        },
      });
      await Promise.all([
        tx.auditLog.create({
          data: {
            actorId,
            action: `SERVER_STATUS_${input.action}`,
            entityType: "SERVER",
            entityId: before.id,
            beforeSnapshot: {
              moderationStatus: before.moderationStatus,
              publicListing: before.publicListing,
            },
            afterSnapshot: {
              moderationStatus: updated.moderationStatus,
              publicListing: updated.publicListing,
            },
            reason: input.reason,
            requestId,
          },
        }),
        tx.notification.create({
          data: {
            recipientId: before.ownerId,
            category: "SERVER",
            title: `${before.name} moderation status updated`,
            body: input.reason,
            actionUrl: "/owner/servers",
            dedupeKey: `server-status:${requestId}`,
          },
        }),
      ]);
      return updated;
    });
  }
}
