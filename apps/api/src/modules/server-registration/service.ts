import { prisma, Prisma } from "@nortix/database";
import type { ServerInput } from "@nortix/shared";
import { canDeleteServerRegistration, normalizeServerHostname } from "./policy.js";

type RegistrationOptions = {
  ownerId: string;
  input: ServerInput;
  slug: string;
  serverIcon: string | null;
  verificationParent?: { id: string } | null;
};

export class ServerRegistrationService {
  async create(options: RegistrationOptions) {
    const normalizedHostname = normalizeServerHostname(options.input.hostname);
    try {
      return await prisma.$transaction(
        async (tx) => {
          const [sameOwner, claimedEndpoint, user] = await Promise.all([
            tx.server.findFirst({
              where: {
                ownerId: options.ownerId,
                edition: options.input.edition,
                normalizedHostname,
                port: options.input.port,
                verificationStatus: { not: "EXPIRED" },
              },
              select: { id: true },
            }),
            tx.server.findFirst({
              where: {
                edition: options.input.edition,
                normalizedHostname,
                port: options.input.port,
                claimed: true,
              },
              select: { id: true },
            }),
            tx.user.findUniqueOrThrow({
              where: { id: options.ownerId },
              select: { roles: true },
            }),
          ]);
          if (sameOwner) {
            throw new Error("This server address is already registered on your Nortix account.");
          }
          if (claimedEndpoint) {
            throw new Error("This server address has already been claimed.");
          }
          const roles = Array.from(new Set([...user.roles, "SERVER_OWNER" as const]));
          await tx.user.update({ where: { id: options.ownerId }, data: { roles } });
          const created = await tx.server.create({
            data: {
              ownerId: options.ownerId,
              name: options.input.name,
              slug: options.slug,
              description: options.input.description,
              hostname: normalizedHostname,
              normalizedHostname,
              port: options.input.port,
              edition: options.input.edition,
              versions: options.input.versions,
              categories: options.input.categories,
              tags: options.input.tags,
              maxPlayers: options.input.maxPlayers,
              bannerUrl: options.input.bannerUrl,
              verificationParentId: options.verificationParent?.id,
              verificationScope: options.verificationParent ? "PROXY_CHILD" : "SERVER",
              verificationStatus: options.verificationParent ? "VERIFIED" : "UNVERIFIED",
              claimed: Boolean(options.verificationParent),
              websiteUrl: options.input.websiteUrl,
              discordUrl: options.input.discordUrl,
              logoUrl: options.serverIcon,
              screenshotUrls: [],
            },
          });
          if (options.verificationParent) {
            await tx.serverVerification.create({
              data: {
                serverId: created.id,
                provider: "PROXY_INHERITED",
                status: "VERIFIED",
                challenge: {
                  parentProxyId: options.verificationParent.id,
                  networkScope: "PROXY_CHILD",
                },
                evidence: {
                  inheritedAt: new Date().toISOString(),
                  parentProxyId: options.verificationParent.id,
                },
              },
            });
            const competitors = await tx.server.findMany({
              where: {
                id: { not: created.id },
                edition: created.edition,
                normalizedHostname: created.normalizedHostname,
                port: created.port,
                claimed: false,
                verificationStatus: { in: ["UNVERIFIED", "PENDING"] },
              },
              select: { id: true },
            });
            const competitorIds = competitors.map((item) => item.id);
            if (competitorIds.length > 0) {
              await Promise.all([
                tx.server.updateMany({
                  where: { id: { in: competitorIds }, claimed: false },
                  data: { verificationStatus: "EXPIRED", publicListing: false },
                }),
                tx.serverVerification.updateMany({
                  where: { serverId: { in: competitorIds }, status: "PENDING" },
                  data: { status: "EXPIRED" },
                }),
                ...competitorIds.map((id) =>
                  tx.auditLog.create({
                    data: {
                      actorId: options.ownerId,
                      action: "server.registration.expired_by_claim",
                      entityType: "Server",
                      entityId: id,
                      reason: "A verified proxy owner registered this inherited endpoint.",
                      afterSnapshot: { verificationStatus: "EXPIRED", claimed: false },
                    },
                  }),
                ),
              ]);
            }
          }
          return created;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === "P2002" || error.code === "P2034")
      ) {
        throw new Error("This server address is already registered or has already been claimed.");
      }
      throw error;
    }
  }

  async deleteRegistration(
    ownerId: string,
    serverId: string,
    input: { confirmationName: string; reason: string },
    requestId: string,
  ) {
    return prisma.$transaction(async (tx) => {
      const server = await tx.server.findFirst({
        where: { id: serverId, ownerId },
        select: {
          id: true,
          name: true,
          hostname: true,
          port: true,
          edition: true,
          claimed: true,
          verificationStatus: true,
          verificationScope: true,
          _count: {
            select: {
              campaigns: true,
              networkServers: true,
              teamMembers: true,
              teamInvites: true,
            },
          },
        },
      });
      if (!server) throw new Error("Server registration not found.");
      if (input.confirmationName !== server.name) {
        throw new Error("The server name confirmation does not match.");
      }
      if (!canDeleteServerRegistration(server)) {
        throw new Error("Claimed or inherited server registrations cannot be deleted.");
      }
      if (
        server._count.campaigns > 0 ||
        server._count.networkServers > 0 ||
        server._count.teamMembers > 0 ||
        server._count.teamInvites > 0
      ) {
        throw new Error("This server registration still has linked owner data and cannot be deleted.");
      }
      await tx.server.delete({ where: { id: server.id } });
      await tx.auditLog.create({
        data: {
          actorId: ownerId,
          action: "server.registration.deleted",
          entityType: "Server",
          entityId: server.id,
          requestId,
          reason: input.reason,
          beforeSnapshot: {
            name: server.name,
            hostname: server.hostname,
            port: server.port,
            edition: server.edition,
            verificationStatus: server.verificationStatus,
          },
          afterSnapshot: { deleted: true },
        },
      });
      return { deleted: true as const, serverId: server.id };
    });
  }
}
