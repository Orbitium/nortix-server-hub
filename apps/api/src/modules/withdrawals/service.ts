import { prisma } from "@nortix/database";
import type { WithdrawalInput } from "@nortix/shared";
import { assertWithdrawalTransition } from "../ledger/ledger.js";

export class WithdrawalService {
  async request(playerId: string, input: WithdrawalInput) {
    return prisma.$transaction(async (tx) => {
      const entries = await tx.earningsLedgerEntry.findMany({
        where: { userId: playerId, currency: input.currency },
      });
      const available = entries.reduce(
        (balance, entry) =>
          balance + (entry.direction === "CREDIT" ? entry.amountCents : -entry.amountCents),
        0,
      );
      if (available < input.amountCents)
        throw new Error("Available earnings are lower than the requested amount.");
      const withdrawal = await tx.withdrawalRequest.create({
        data: {
          playerId,
          requestedAmountCents: input.amountCents,
          currency: input.currency,
          payoutProvider: input.payoutProvider,
          payoutDestinationReference: input.payoutDestinationReference,
        },
      });
      await tx.earningsLedgerEntry.create({
        data: {
          userId: playerId,
          direction: "DEBIT",
          amountCents: input.amountCents,
          currency: input.currency,
          transactionType: "WITHDRAWAL_RESERVATION",
          referenceType: "WITHDRAWAL",
          referenceId: withdrawal.id,
          idempotencyKey: `withdrawal:${withdrawal.id}:reservation`,
        },
      });
      return withdrawal;
    });
  }

  async transition(actorId: string, withdrawalId: string, nextStatus: string, reason?: string) {
    return prisma.$transaction(async (tx) => {
      const withdrawal = await tx.withdrawalRequest.findUnique({ where: { id: withdrawalId } });
      if (!withdrawal) throw new Error("Withdrawal not found.");
      assertWithdrawalTransition(withdrawal.status, nextStatus);
      if (nextStatus === "CANCELLED") {
        await tx.earningsLedgerEntry.upsert({
          where: { idempotencyKey: `withdrawal:${withdrawal.id}:cancellation` },
          update: {},
          create: {
            userId: withdrawal.playerId,
            direction: "CREDIT",
            amountCents: withdrawal.requestedAmountCents,
            currency: withdrawal.currency,
            transactionType: "WITHDRAWAL_CANCELLATION",
            referenceType: "WITHDRAWAL",
            referenceId: withdrawal.id,
            idempotencyKey: `withdrawal:${withdrawal.id}:cancellation`,
            createdById: actorId,
            internalNote: reason,
          },
        });
      }
      const updated = await tx.withdrawalRequest.update({
        where: { id: withdrawalId },
        data: {
          status: nextStatus as never,
          reviewedById: actorId,
          internalNote: reason,
          completedAt: nextStatus === "PAID" ? new Date() : undefined,
        },
      });
      await tx.auditLog.create({
        data: {
          actorId,
          action: "WITHDRAWAL_STATUS_CHANGED",
          entityType: "WITHDRAWAL",
          entityId: withdrawalId,
          beforeSnapshot: { status: withdrawal.status },
          afterSnapshot: { status: nextStatus },
          reason,
        },
      });
      return updated;
    });
  }
}
