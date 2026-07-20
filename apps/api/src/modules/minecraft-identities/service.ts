import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@nortix/database";
import {
  canActivateFirstJoin,
  crackedReservationRejection,
} from "../../security/minecraft-link-policy.js";

const normalizeUsername = (value: string) => value.trim().toLowerCase();
const hashCode = (value: string) => createHash("sha256").update(value).digest("hex");

export class MinecraftIdentityService {
  async cleanup(now = new Date()) {
    const [premium, pending, inactive] = await Promise.all([
      prisma.premiumIdentityClaim.findMany({
        where: { status: "PENDING", expiresAt: { lte: now } },
        select: { id: true, userId: true },
      }),
      prisma.crackedAccountLink.findMany({
        where: { status: "PENDING", expiresAt: { lte: now } },
        select: { id: true, userId: true, serverId: true, minecraftUsername: true },
      }),
      prisma.crackedAccountLink.findMany({
        where: {
          status: "ACTIVE",
          expiresAt: { lte: now },
          participations: { none: { completions: { some: {} } } },
        },
        select: { id: true, userId: true, serverId: true, minecraftUsername: true },
      }),
    ]);
    await prisma.$transaction(async (tx) => {
      for (const claim of premium) {
        const changed = await tx.premiumIdentityClaim.updateMany({
          where: { id: claim.id, status: "PENDING" },
          data: { status: "EXPIRED" },
        });
        if (changed.count) await tx.minecraftIdentityActivity.create({
          data: { userId: claim.userId, type: "PREMIUM_CLAIM_EXPIRED", identityKind: "PREMIUM" },
        });
      }
      for (const link of pending) {
        const changed = await tx.crackedAccountLink.updateMany({
          where: { id: link.id, status: "PENDING" },
          data: { status: "EXPIRED", releasedAt: now, releaseReason: "JOIN_WINDOW_EXPIRED" },
        });
        if (changed.count) await tx.minecraftIdentityActivity.create({
          data: {
            userId: link.userId,
            serverId: link.serverId,
            type: "CRACKED_RESERVATION_EXPIRED",
            identityKind: "SERVER_SCOPED_CRACKED",
            minecraftUsername: link.minecraftUsername,
          },
        });
      }
      for (const link of inactive) {
        const changed = await tx.crackedAccountLink.updateMany({
          where: { id: link.id, status: "ACTIVE" },
          data: {
            status: "RELEASED",
            releasedAt: now,
            releaseReason: "NO_MILESTONE_WITHIN_THREE_DAYS",
          },
        });
        if (changed.count) await tx.minecraftIdentityActivity.create({
          data: {
            userId: link.userId,
            serverId: link.serverId,
            type: "CRACKED_LINK_RELEASED_INACTIVE",
            identityKind: "SERVER_SCOPED_CRACKED",
            minecraftUsername: link.minecraftUsername,
          },
        });
      }
    });
  }

  async list(userId: string) {
    await this.cleanup();
    const [premium, cracked, activity] = await Promise.all([
      prisma.minecraftIdentity.findMany({
        where: { userId, verified: true },
        select: {
          id: true,
          uuid: true,
          username: true,
          lastKnownUsername: true,
          verificationMethod: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.crackedAccountLink.findMany({
        where: { userId, status: { in: ["PENDING", "ACTIVE"] } },
        select: {
          id: true,
          minecraftUsername: true,
          status: true,
          reservedAt: true,
          expiresAt: true,
          activatedAt: true,
          server: { select: { id: true, name: true, slug: true, logoUrl: true } },
        },
        orderBy: { reservedAt: "desc" },
      }),
      prisma.minecraftIdentityActivity.findMany({
        where: { userId },
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
      }),
    ]);
    return { premium, cracked, activity };
  }

  async createPremiumClaim(userId: string) {
    const raw = randomBytes(6).toString("hex").toUpperCase();
    const code = `NX-${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
    const expiresAt = new Date(Date.now() + 10 * 60_000);
    await prisma.$transaction(async (tx) => {
      await tx.premiumIdentityClaim.updateMany({
        where: { userId, status: "PENDING" },
        data: { status: "CANCELLED" },
      });
      await tx.premiumIdentityClaim.create({
        data: { userId, codeHash: hashCode(code), expiresAt },
      });
      await tx.minecraftIdentityActivity.create({
        data: {
          userId,
          type: "PREMIUM_CLAIM_CREATED",
          identityKind: "PREMIUM",
          metadata: { expiresAt: expiresAt.toISOString() },
        },
      });
    });
    return { code, expiresAt, verificationServer: "verify.nortixlabs.com" };
  }

  async completePremiumClaim(code: string, uuid: string, username: string) {
    return prisma.$transaction(async (tx) => {
      const claim = await tx.premiumIdentityClaim.findUnique({
        where: { codeHash: hashCode(code.trim().toUpperCase()) },
      });
      if (!claim || claim.status !== "PENDING" || claim.expiresAt <= new Date()) {
        throw new Error("Identity claim is invalid or expired.");
      }
      const existing = await tx.minecraftIdentity.findUnique({ where: { uuid } });
      if (existing && existing.userId !== claim.userId) {
        await tx.minecraftIdentityActivity.create({
          data: {
            userId: claim.userId,
            type: "PREMIUM_CLAIM_CONFLICT",
            identityKind: "PREMIUM",
            minecraftUuid: uuid,
            minecraftUsername: username,
          },
        });
        throw new Error("This Minecraft account is already linked.");
      }
      const identity = existing
        ? await tx.minecraftIdentity.update({
            where: { id: existing.id },
            data: {
              username,
              lastKnownUsername: username,
              verified: true,
              verificationMethod: "NORTIX_ONLINE_MODE_SERVER",
            },
          })
        : await tx.minecraftIdentity.create({
            data: {
              userId: claim.userId,
              uuid,
              username,
              lastKnownUsername: username,
              verified: true,
              verificationMethod: "NORTIX_ONLINE_MODE_SERVER",
            },
          });
      await tx.premiumIdentityClaim.update({
        where: { id: claim.id },
        data: { status: "COMPLETED", completedAt: new Date() },
      });
      await tx.minecraftIdentityActivity.create({
        data: {
          userId: claim.userId,
          type: "PREMIUM_LINKED",
          identityKind: "PREMIUM",
          minecraftUuid: uuid,
          minecraftUsername: username,
        },
      });
      return identity;
    }, { isolationLevel: "Serializable" });
  }

  async unlinkPremium(userId: string, identityId: string) {
    return prisma.$transaction(async (tx) => {
      const identity = await tx.minecraftIdentity.findFirst({
        where: { id: identityId, userId },
      });
      if (!identity) throw new Error("Minecraft identity not found.");
      await tx.campaignParticipation.updateMany({
        where: { minecraftIdentityId: identity.id },
        data: { minecraftIdentityId: null },
      });
      await tx.minecraftIdentity.delete({ where: { id: identity.id } });
      await tx.minecraftIdentityActivity.create({
        data: {
          userId,
          type: "PREMIUM_UNLINKED",
          identityKind: "PREMIUM",
          minecraftUuid: identity.uuid,
          minecraftUsername: identity.lastKnownUsername,
        },
      });
    });
  }

  async reserveCracked(userId: string, serverId: string, minecraftUsername: string) {
    await this.cleanup();
    const normalizedUsername = normalizeUsername(minecraftUsername);
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60_000);
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60_000);
    return prisma.$transaction(async (tx) => {
      const server = await tx.server.findFirst({
        where: {
          id: serverId,
          publicListing: true,
          moderationStatus: "APPROVED",
          claimed: true,
          verificationStatus: "VERIFIED",
        },
        select: { id: true, name: true, playerHistorySyncedAt: true },
      });
      if (!server) throw new Error("This server is not available for account linking.");
      if (!server.playerHistorySyncedAt) {
        throw new Error("This server is still syncing previous player names.");
      }
      const presence = await tx.serverPlayerPresence.findUnique({
        where: { serverId_normalizedUsername: { serverId, normalizedUsername } },
      });
      const open = await tx.crackedAccountLink.findFirst({
        where: { serverId, normalizedUsername, status: { in: ["PENDING", "ACTIVE"] } },
      });
      const [hourCount, dayCount] = await Promise.all([
        tx.crackedAccountLink.count({ where: { userId, reservedAt: { gte: hourAgo } } }),
        tx.crackedAccountLink.count({ where: { userId, reservedAt: { gte: dayAgo } } }),
      ]);
      const rejection = crackedReservationRejection({
        playedBefore: Boolean(presence),
        openLinkOwnerId: open?.userId,
        requesterId: userId,
        claimsLastHour: hourCount,
        claimsLastDay: dayCount,
      });
      if (rejection) throw new Error(rejection);
      const expiresAt = new Date(now.getTime() + 30 * 60_000);
      const link = await tx.crackedAccountLink.create({
        data: {
          userId,
          serverId,
          minecraftUsername,
          normalizedUsername,
          expiresAt,
        },
        select: {
          id: true,
          minecraftUsername: true,
          status: true,
          reservedAt: true,
          expiresAt: true,
          server: { select: { id: true, name: true, slug: true } },
        },
      });
      await tx.minecraftIdentityActivity.create({
        data: {
          userId,
          serverId,
          type: "CRACKED_RESERVED",
          identityKind: "SERVER_SCOPED_CRACKED",
          minecraftUsername,
          metadata: { expiresAt: expiresAt.toISOString() },
        },
      });
      return link;
    }, { isolationLevel: "Serializable" });
  }

  async observeServerJoin(serverId: string, minecraftUsername: string, occurredAt: Date) {
    const normalizedUsername = normalizeUsername(minecraftUsername);
    const now = new Date();
    return prisma.$transaction(async (tx) => {
      const existingPresence = await tx.serverPlayerPresence.findUnique({
        where: { serverId_normalizedUsername: { serverId, normalizedUsername } },
      });
      if (existingPresence) {
        await tx.serverPlayerPresence.update({
          where: { id: existingPresence.id },
          data: { lastSeenAt: now, minecraftUsername },
        });
        return null;
      }
      await tx.serverPlayerPresence.create({
        data: {
          serverId,
          normalizedUsername,
          minecraftUsername,
          firstSeenAt: occurredAt,
          lastSeenAt: occurredAt,
        },
      });
      const pending = await tx.crackedAccountLink.findFirst({
        where: {
          serverId,
          normalizedUsername,
          status: "PENDING",
        },
      });
      if (!pending || !canActivateFirstJoin({
        presenceAlreadyExists: false,
        status: pending.status,
        reservedAt: pending.reservedAt,
        expiresAt: pending.expiresAt,
        occurredAt,
      })) return null;
      const retentionDeadline = new Date(occurredAt.getTime() + 3 * 24 * 60 * 60_000);
      const link = await tx.crackedAccountLink.update({
        where: { id: pending.id },
        data: { status: "ACTIVE", activatedAt: occurredAt, expiresAt: retentionDeadline },
      });
      await tx.minecraftIdentityActivity.create({
        data: {
          userId: link.userId,
          serverId,
          type: "CRACKED_LINK_ACTIVATED",
          identityKind: "SERVER_SCOPED_CRACKED",
          minecraftUsername,
          metadata: { retainIfMilestoneCompletedBy: retentionDeadline.toISOString() },
        },
      });
      return link;
    }, { isolationLevel: "Serializable" });
  }

  async releaseCracked(userId: string, linkId: string) {
    const result = await prisma.crackedAccountLink.updateMany({
      where: { id: linkId, userId, status: { in: ["PENDING", "ACTIVE"] } },
      data: { status: "RELEASED", releasedAt: new Date(), releaseReason: "USER_RELEASED" },
    });
    if (result.count !== 1) throw new Error("Cracked account link not found.");
    const link = await prisma.crackedAccountLink.findUniqueOrThrow({ where: { id: linkId } });
    await prisma.minecraftIdentityActivity.create({
      data: {
        userId,
        serverId: link.serverId,
        type: "CRACKED_LINK_RELEASED",
        identityKind: "SERVER_SCOPED_CRACKED",
        minecraftUsername: link.minecraftUsername,
      },
    });
  }
}

export const premiumClaimCodeHash = hashCode;
