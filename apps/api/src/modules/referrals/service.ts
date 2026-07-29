import { randomBytes } from "node:crypto";
import { prisma, type Prisma } from "@nortix/database";
import {
  MAX_OPEN_REFERRAL_INVITES,
  MAX_MONTHLY_REFERRAL_INVITES,
  REFERRAL_CLAIM_WINDOW_HOURS,
  REFERRAL_INVITE_LIFETIME_DAYS,
  referralEarningWindowEndsAt,
  referralMonthWindow,
  referralProgress,
} from "./policy.js";

const inviteAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const inviteCode = () => {
  const bytes = randomBytes(8);
  const value = Array.from(bytes, (byte) => inviteAlphabet[byte % inviteAlphabet.length]).join("");
  return `NFX-${value.slice(0, 4)}-${value.slice(4, 8)}`;
};

const earnedSparks = async (
  tx: Prisma.TransactionClient,
  userId: string,
  claimedAt: Date,
) => {
  const result = await tx.sparksLedgerEntry.aggregate({
    where: {
      userId,
      direction: "CREDIT",
      createdAt: { gte: claimedAt, lt: referralEarningWindowEndsAt(claimedAt) },
    },
    _sum: { amount: true },
  });
  return result._sum.amount ?? 0;
};

export async function reconcileReferredUser(tx: Prisma.TransactionClient, userId: string) {
  const invite = await tx.referralInvite.findUnique({
    where: { inviteeId: userId },
    select: { id: true, inviterId: true, claimedAt: true, qualifiedAt: true },
  });
  if (!invite?.claimedAt || invite.qualifiedAt) return null;

  const progress = referralProgress(await earnedSparks(tx, userId, invite.claimedAt));
  if (!progress.qualified) return null;

  const qualifiedAt = new Date();
  const updated = await tx.referralInvite.updateMany({
    where: { id: invite.id, qualifiedAt: null },
    data: { qualifiedAt },
  });
  if (!updated.count) return null;

  await tx.auditLog.create({
    data: {
      action: "REFERRAL_QUALIFIED",
      entityType: "REFERRAL_INVITE",
      entityId: invite.id,
      afterSnapshot: {
        status: "QUALIFIED",
        creditedSparks: progress.creditedSparks,
        requiredSparks: progress.requiredSparks,
      },
      reason: "Referred account reached the backend-verified Sparks threshold.",
    },
  });
  return invite.inviterId;
}

const statusFor = (invite: {
  claimedAt: Date | null;
  qualifiedAt: Date | null;
  expiresAt: Date;
}) => {
  if (invite.qualifiedAt) return "QUALIFIED" as const;
  if (invite.claimedAt) return "REGISTERED" as const;
  if (invite.expiresAt <= new Date()) return "EXPIRED" as const;
  return "OPEN" as const;
};

export class ReferralService {
  async create(inviterId: string, requestId?: string) {
    return prisma.$transaction(
      async (tx) => {
        const now = new Date();
        const month = referralMonthWindow(now);
        const [openCount, monthlyCount] = await Promise.all([
          tx.referralInvite.count({
            where: { inviterId, inviteeId: null, expiresAt: { gt: now } },
          }),
          tx.referralInvite.count({
            where: {
              inviterId,
              createdAt: { gte: month.startsAt, lt: month.endsAt },
            },
          }),
        ]);
        if (openCount >= MAX_OPEN_REFERRAL_INVITES) {
          throw new Error("You already have too many open referral invites.");
        }
        if (monthlyCount >= MAX_MONTHLY_REFERRAL_INVITES) {
          throw new Error(
            `You can create up to ${MAX_MONTHLY_REFERRAL_INVITES} friend invites per calendar month.`,
          );
        }

        const expiresAt = new Date(
          now.getTime() + REFERRAL_INVITE_LIFETIME_DAYS * 24 * 60 * 60 * 1_000,
        );
        const invite = await tx.referralInvite.create({
          data: { code: inviteCode(), inviterId, expiresAt },
          select: { id: true, code: true, createdAt: true, expiresAt: true },
        });
        await tx.auditLog.create({
          data: {
            actorId: inviterId,
            action: "REFERRAL_INVITE_CREATED",
            entityType: "REFERRAL_INVITE",
            entityId: invite.id,
            afterSnapshot: {
              expiresAt: invite.expiresAt.toISOString(),
              monthlyInviteNumber: monthlyCount + 1,
            },
            requestId,
          },
        });
        return invite;
      },
      { isolationLevel: "Serializable" },
    );
  }

  async claim(inviteeId: string, code: string, requestId?: string) {
    return prisma.$transaction(
      async (tx) => {
        const [invitee, invite] = await Promise.all([
          tx.user.findUnique({
            where: { id: inviteeId },
            select: { createdAt: true },
          }),
          tx.referralInvite.findUnique({
            where: { code },
            select: {
              id: true,
              inviterId: true,
              inviteeId: true,
              expiresAt: true,
              claimedAt: true,
            },
          }),
        ]);
        if (!invite || invite.expiresAt <= new Date()) {
          throw new Error("This referral invite is invalid or expired.");
        }
        if (!invitee) throw new Error("The referred account was not found.");
        if (invite.inviterId === inviteeId)
          throw new Error("You cannot claim your own referral invite.");
        if (
          Date.now() - invitee.createdAt.getTime() >
          REFERRAL_CLAIM_WINDOW_HOURS * 60 * 60 * 1_000
        ) {
          throw new Error("Referral invites can only be claimed during account registration.");
        }
        if (invite.inviteeId || invite.claimedAt) {
          throw new Error("This referral invite has already been claimed.");
        }
        const existing = await tx.referralInvite.findUnique({
          where: { inviteeId },
          select: { id: true },
        });
        if (existing) throw new Error("This account has already claimed a referral invite.");

        const claimedAt = new Date();
        const earningWindowEndsAt = referralEarningWindowEndsAt(claimedAt);
        const claimed = await tx.referralInvite.updateMany({
          where: { id: invite.id, inviteeId: null, claimedAt: null, expiresAt: { gt: claimedAt } },
          data: { inviteeId, claimedAt },
        });
        if (!claimed.count) throw new Error("This referral invite has already been claimed.");
        await tx.auditLog.create({
          data: {
            actorId: inviteeId,
            action: "REFERRAL_INVITE_CLAIMED",
            entityType: "REFERRAL_INVITE",
            entityId: invite.id,
            beforeSnapshot: { status: "OPEN" },
            afterSnapshot: {
              status: "REGISTERED",
              earningWindowEndsAt: earningWindowEndsAt.toISOString(),
            },
            requestId,
          },
        });
        return { status: "REGISTERED" as const };
      },
      { isolationLevel: "Serializable" },
    );
  }

  async list(inviterId: string) {
    const invites = await prisma.$transaction(
      async (tx) => {
        const pending = await tx.referralInvite.findMany({
          where: { inviterId, inviteeId: { not: null }, qualifiedAt: null },
          select: { inviteeId: true },
        });
        for (const invite of pending) {
          if (invite.inviteeId) await reconcileReferredUser(tx, invite.inviteeId);
        }
        return tx.referralInvite.findMany({
          where: { inviterId },
          select: {
            id: true,
            code: true,
            createdAt: true,
            expiresAt: true,
            claimedAt: true,
            qualifiedAt: true,
            inviteeId: true,
          },
          orderBy: { createdAt: "desc" },
          take: 100,
        });
      },
      { isolationLevel: "Serializable" },
    );

    const progressByInvitee = new Map<string, number>();
    await Promise.all(
      invites.map(async (invite) => {
        if (!invite.inviteeId || !invite.claimedAt || invite.qualifiedAt) return;
        progressByInvitee.set(
          invite.inviteeId,
          await earnedSparks(prisma, invite.inviteeId, invite.claimedAt),
        );
      }),
    );

    return invites.map(({ inviteeId, ...invite }, index) => {
      const progress = referralProgress(
        invite.qualifiedAt ? 200 : inviteeId ? (progressByInvitee.get(inviteeId) ?? 0) : 0,
      );
      return {
        ...invite,
        label: `Invite ${invites.length - index}`,
        status: statusFor(invite),
        creditedSparks: progress.creditedSparks,
        requiredSparks: progress.requiredSparks,
        earningWindowEndsAt: invite.claimedAt
          ? referralEarningWindowEndsAt(invite.claimedAt).toISOString()
          : null,
        earningWindowActive: invite.claimedAt
          ? new Date() < referralEarningWindowEndsAt(invite.claimedAt)
          : false,
      };
    });
  }
}
