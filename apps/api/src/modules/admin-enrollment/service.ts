import { Prisma, prisma } from "@nortix/database";
import { hashAdminEnrollmentToken } from "./token.js";

export class AdminEnrollmentError extends Error {
  statusCode = 400;
}

export class AdminEnrollmentService {
  async redeem(userId: string, token: string, requestId?: string) {
    const now = new Date();
    const tokenHash = hashAdminEnrollmentToken(token);

    return prisma.$transaction(
      async (tx) => {
        const claimed = await tx.adminEnrollmentToken.updateMany({
          where: {
            tokenHash,
            consumedAt: null,
            expiresAt: { gt: now },
          },
          data: {
            consumedAt: now,
            consumedById: userId,
          },
        });
        if (claimed.count !== 1) {
          throw new AdminEnrollmentError("The admin enrollment token is invalid or expired.");
        }

        const current = await tx.user.findUnique({
          where: { id: userId },
          select: { roles: true },
        });
        if (!current) {
          throw new AdminEnrollmentError("The admin enrollment token is invalid or expired.");
        }

        const roles = current.roles.includes("ADMIN")
          ? current.roles
          : [...current.roles, "ADMIN" as const];
        const updated = await tx.user.update({
          where: { id: userId },
          data: { roles: { set: roles } },
          select: {
            id: true,
            username: true,
            displayName: true,
            roles: true,
            status: true,
          },
        });

        await tx.auditLog.create({
          data: {
            actorId: userId,
            action: "user.admin_enrolled",
            entityType: "User",
            entityId: userId,
            requestId,
            reason: "Redeemed a short-lived, single-use operator enrollment token.",
            beforeSnapshot: { roles: current.roles } as Prisma.InputJsonValue,
            afterSnapshot: { roles: updated.roles } as Prisma.InputJsonValue,
          },
        });

        return updated;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }
}
