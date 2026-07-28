import { randomBytes } from "node:crypto";
import { prisma, type Prisma } from "@nortix/database";
import {
  MAX_OPEN_REFERRAL_INVITES,
  REFERRAL_CLAIM_WINDOW_HOURS,
  REFERRAL_INVITE_LIFETIME_DAYS,
  referralProgress,
} from "./policy.js";

const inviteAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const inviteCode = () => {
  const bytes = randomBytes(8);
  const value = Array.from(bytes, (byte) => inviteAlphabet[byte % inviteAlphabet.length]).join("");
  return `NFX-${value.slice(0, 4)}-${value.slice(4, 8)}`;
};

const earnedSparks = async (tx: Prisma.TransactionClient, userId: string) => {
  const result = await tx.sparksLedgerEntry.aggregate({
    where: { userId, direction: "CREDIT" },
    _sum: { amount: true },
  });
  return result._sum.amount ?? 0;
};

export async function reconcileReferredUser(tx: Prisma.TransactionClient, userId: string) {
  const invite = await tx.referralInvite.findUnique({
    where: { inviteeId: userId },
    select: { id: true, inviterId: true, qualifiedAt: true },
  });
  if (!invite || invite.qualifiedAt) return null;

  const progress = referralProgress(await earnedSparks(tx, userId));
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
        const openCount = await tx.referralInvite.count({
          where: { inviterId, inviteeId: null, expiresAt: { gt: new Date() } },
        });
        if (openCount >= MAX_OPEN_REFERRAL_INVITES) {
          throw new Error("You already have too many open referral invites.");
        }

        const expiresAt = new Date(
          Date.now() + REFERRAL_INVITE_LIFETIME_DAYS * 24 * 60 * 60 * 1_000,
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
            afterSnapshot: { expiresAt: invite.expiresAt.toISOString() },
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
            afterSnapshot: { status: "REGISTERED" },
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
        if (!invite.inviteeId || invite.qualifiedAt) return;
        const result = await prisma.sparksLedgerEntry.aggregate({
          where: { userId: invite.inviteeId, direction: "CREDIT" },
          _sum: { amount: true },
        });
        progressByInvitee.set(invite.inviteeId, result._sum.amount ?? 0);
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
      };
    });
  }
}
