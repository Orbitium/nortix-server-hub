import { prisma, type Prisma } from "@nortix/database";
import type { z } from "zod";
import type {
  AdminMessageInputSchema,
  NotificationPreferenceInputSchema,
} from "@nortix/shared";

type AdminMessageInput = z.infer<typeof AdminMessageInputSchema>;
type NotificationPreferenceInput = z.infer<typeof NotificationPreferenceInputSchema>;

const preferenceField = {
  CAMPAIGN: "campaignActivity",
  QUEST: "questsAndStreaks",
  SPARKS: "sparksActivity",
  SERVER: "serverOperations",
  TEAM: "teamActivity",
  SYSTEM: "productUpdates",
} as const;

export type NotificationInput = {
  recipientId: string;
  category: "CAMPAIGN" | "QUEST" | "SPARKS" | "SERVER" | "TEAM" | "SECURITY" | "SYSTEM";
  title: string;
  body: string;
  actionUrl?: string;
  dedupeKey?: string;
};

type NotificationStore = Pick<Prisma.TransactionClient, "notification" | "notificationPreference">;

const recipientWhereFor = (
  audience: "ALL_USERS" | "PLAYERS" | "SERVER_OWNERS" | "LIMITED_ACCOUNTS" | "USER",
  targetUserId?: string | null,
): Prisma.UserWhereInput => ({
  ...(audience === "ALL_USERS" ? { status: { not: "BANNED" } } : {}),
  ...(audience === "PLAYERS" ? { roles: { has: "PLAYER" }, status: "ACTIVE" } : {}),
  ...(audience === "SERVER_OWNERS"
    ? { roles: { has: "SERVER_OWNER" }, status: "ACTIVE" }
    : {}),
  ...(audience === "LIMITED_ACCOUNTS"
    ? { status: { in: ["LIMITED", "UNDER_REVIEW", "SUSPENDED"] } }
    : {}),
  ...(audience === "USER" ? { id: targetUserId! } : {}),
});

export async function createNotification(store: NotificationStore, input: NotificationInput) {
  if (input.category !== "SECURITY") {
    const preferences = await store.notificationPreference.findUnique({
      where: { userId: input.recipientId },
    });
    const field = preferenceField[input.category];
    if (preferences && !preferences[field]) return null;
  }

  const data = {
    recipientId: input.recipientId,
    category: input.category,
    title: input.title,
    body: input.body,
    actionUrl: input.actionUrl,
    dedupeKey: input.dedupeKey,
  } as const;

  if (!input.dedupeKey) return store.notification.create({ data });
  return store.notification.upsert({
    where: {
      recipientId_dedupeKey: {
        recipientId: input.recipientId,
        dedupeKey: input.dedupeKey,
      },
    },
    create: data,
    update: {
      title: input.title,
      body: input.body,
      actionUrl: input.actionUrl,
      readAt: null,
      archivedAt: null,
      createdAt: new Date(),
    },
  });
}

export class NotificationService {
  async summary(userId: string) {
    const [notifications, messages] = await prisma.$transaction([
      prisma.notification.count({
        where: { recipientId: userId, readAt: null, archivedAt: null },
      }),
      prisma.adminMessageDelivery.count({
        where: { recipientId: userId, readAt: null, archivedAt: null },
      }),
    ]);
    return { unreadNotifications: notifications, unreadMessages: messages };
  }

  async listNotifications(userId: string, unreadOnly: boolean) {
    return prisma.notification.findMany({
      where: {
        recipientId: userId,
        archivedAt: null,
        ...(unreadOnly ? { readAt: null } : {}),
      },
      select: {
        id: true,
        category: true,
        title: true,
        body: true,
        actionUrl: true,
        readAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  async listMessages(userId: string, unreadOnly: boolean) {
    return prisma.adminMessageDelivery.findMany({
      where: {
        recipientId: userId,
        archivedAt: null,
        ...(unreadOnly ? { readAt: null } : {}),
      },
      select: {
        id: true,
        readAt: true,
        deliveredAt: true,
        message: {
          select: {
            id: true,
            title: true,
            body: true,
            severity: true,
            actionUrl: true,
            sentAt: true,
            createdBy: { select: { displayName: true } },
          },
        },
      },
      orderBy: { deliveredAt: "desc" },
      take: 100,
    });
  }

  async markNotificationRead(userId: string, id: string) {
    const result = await prisma.notification.updateMany({
      where: { id, recipientId: userId, archivedAt: null },
      data: { readAt: new Date() },
    });
    if (result.count !== 1) throw new Error("Notification not found.");
  }

  async markMessageRead(userId: string, id: string) {
    const result = await prisma.adminMessageDelivery.updateMany({
      where: { id, recipientId: userId, archivedAt: null },
      data: { readAt: new Date() },
    });
    if (result.count !== 1) throw new Error("Message not found.");
  }

  async markAllRead(userId: string, kind: "notifications" | "messages" | "all") {
    const readAt = new Date();
    const updates: Prisma.PrismaPromise<unknown>[] = [];
    if (kind !== "messages") {
      updates.push(
        prisma.notification.updateMany({
          where: { recipientId: userId, readAt: null, archivedAt: null },
          data: { readAt },
        }),
      );
    }
    if (kind !== "notifications") {
      updates.push(
        prisma.adminMessageDelivery.updateMany({
          where: { recipientId: userId, readAt: null, archivedAt: null },
          data: { readAt },
        }),
      );
    }
    await prisma.$transaction(updates);
  }

  async archive(userId: string, kind: "notification" | "message", id: string) {
    const archivedAt = new Date();
    const result =
      kind === "notification"
        ? await prisma.notification.updateMany({
            where: { id, recipientId: userId },
            data: { archivedAt },
          })
        : await prisma.adminMessageDelivery.updateMany({
            where: { id, recipientId: userId },
            data: { archivedAt },
          });
    if (result.count !== 1) throw new Error(`${kind === "notification" ? "Notification" : "Message"} not found.`);
  }

  async getPreferences(userId: string) {
    return prisma.notificationPreference.upsert({
      where: { userId },
      create: { userId },
      update: {},
      select: {
        campaignActivity: true,
        questsAndStreaks: true,
        sparksActivity: true,
        serverOperations: true,
        teamActivity: true,
        productUpdates: true,
        emailProductUpdates: true,
        updatedAt: true,
      },
    });
  }

  async updatePreferences(userId: string, input: NotificationPreferenceInput) {
    return prisma.notificationPreference.upsert({
      where: { userId },
      create: { userId, ...input },
      update: input,
      select: {
        campaignActivity: true,
        questsAndStreaks: true,
        sparksActivity: true,
        serverOperations: true,
        teamActivity: true,
        productUpdates: true,
        emailProductUpdates: true,
        updatedAt: true,
      },
    });
  }

  async listAdminMessages() {
    return prisma.adminMessage.findMany({
      select: {
        id: true,
        title: true,
        body: true,
        actionUrl: true,
        audience: true,
        severity: true,
        status: true,
        sentAt: true,
        createdAt: true,
        targetUser: { select: { username: true, displayName: true } },
        createdBy: { select: { username: true, displayName: true } },
        _count: { select: { deliveries: true } },
        deliveries: { where: { readAt: { not: null } }, select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  }

  async createAdminMessage(actorId: string, input: AdminMessageInput, requestId?: string) {
    const targetUser =
      input.audience === "USER"
        ? await prisma.user.findFirst({
            where: { username: { equals: input.targetUsername, mode: "insensitive" } },
            select: { id: true },
          })
        : null;
    if (input.audience === "USER" && !targetUser) throw new Error("Target user not found.");

    const recipientWhere = recipientWhereFor(input.audience, targetUser?.id);

    return prisma.$transaction(async (tx) => {
      const recipients =
        input.status === "SENT"
          ? await tx.user.findMany({ where: recipientWhere, select: { id: true } })
          : [];
      const message = await tx.adminMessage.create({
        data: {
          createdById: actorId,
          targetUserId: targetUser?.id,
          audience: input.audience,
          severity: input.severity,
          status: input.status,
          title: input.title,
          body: input.body,
          actionUrl: input.actionUrl,
          sentAt: input.status === "SENT" ? new Date() : null,
        },
      });
      if (recipients.length) {
        await tx.adminMessageDelivery.createMany({
          data: recipients.map(({ id }) => ({ messageId: message.id, recipientId: id })),
          skipDuplicates: true,
        });
      }
      await tx.auditLog.create({
        data: {
          actorId,
          action: input.status === "SENT" ? "ADMIN_MESSAGE_SENT" : "ADMIN_MESSAGE_DRAFTED",
          entityType: "ADMIN_MESSAGE",
          entityId: message.id,
          afterSnapshot: {
            audience: input.audience,
            severity: input.severity,
            recipientCount: recipients.length,
          },
          reason: input.title,
          requestId,
        },
      });
      return { ...message, recipientCount: recipients.length };
    });
  }

  async sendDraft(actorId: string, messageId: string, requestId?: string) {
    return prisma.$transaction(async (tx) => {
      const draft = await tx.adminMessage.findUnique({ where: { id: messageId } });
      if (!draft) throw new Error("Admin message not found.");
      if (draft.status !== "DRAFT") throw new Error("This admin message has already been sent.");
      const recipients = await tx.user.findMany({
        where: recipientWhereFor(draft.audience, draft.targetUserId),
        select: { id: true },
      });
      const claimed = await tx.adminMessage.updateMany({
        where: { id: draft.id, status: "DRAFT" },
        data: { status: "SENT", sentAt: new Date() },
      });
      if (claimed.count !== 1) throw new Error("This admin message has already been sent.");
      if (recipients.length) {
        await tx.adminMessageDelivery.createMany({
          data: recipients.map(({ id }) => ({ messageId: draft.id, recipientId: id })),
          skipDuplicates: true,
        });
      }
      await tx.auditLog.create({
        data: {
          actorId,
          action: "ADMIN_MESSAGE_SENT",
          entityType: "ADMIN_MESSAGE",
          entityId: draft.id,
          beforeSnapshot: { status: "DRAFT" },
          afterSnapshot: { status: "SENT", recipientCount: recipients.length },
          reason: draft.title,
          requestId,
        },
      });
      return { id: draft.id, status: "SENT" as const, recipientCount: recipients.length };
    });
  }
}
