import { createHash, randomBytes } from "node:crypto";
import { prisma, Prisma, type ServerVerification } from "@nortix/database";
import { pingMinecraftServer, type MinecraftStatus } from "./minecraft-status.js";

export type VerificationPlatform = "PAPER" | "VELOCITY";

type ChallengePayload = {
  codeHash: string;
  codeHint: string;
  platform: VerificationPlatform;
  networkScope: "SERVER" | "PROXY_NETWORK";
  format: "MOTD";
};

const CODE_PATTERN = /NORTIX-[A-Z0-9]{4}-[A-Z0-9]{4}/gi;
const hashCode = (code: string) =>
  createHash("sha256").update(code.trim().toUpperCase()).digest("hex");

const challengeOf = (verification: ServerVerification) =>
  verification.challenge as unknown as ChallengePayload;

export const createVerificationCode = () => {
  const raw = randomBytes(5).toString("hex").toUpperCase();
  return `NORTIX-${raw.slice(0, 4)}-${raw.slice(4, 8)}`;
};

export class ServerVerificationService {
  constructor(
    private readonly ping: (
      hostname: string,
      port: number,
      timeoutMs?: number,
    ) => Promise<MinecraftStatus> = pingMinecraftServer,
  ) {}

  async create(serverId: string, ownerId: string, platform: VerificationPlatform) {
    const server = await prisma.server.findFirst({ where: { id: serverId, ownerId } });
    if (!server) throw new Error("Server not found.");
    if (server.claimed || server.verificationStatus === "VERIFIED") {
      throw new Error("This server registration is already verified.");
    }
    if (server.verificationStatus === "EXPIRED") {
      throw new Error("This server registration has expired and cannot be claimed.");
    }
    const competingClaim = await prisma.server.findFirst({
      where: {
        id: { not: server.id },
        edition: server.edition,
        normalizedHostname: server.normalizedHostname,
        port: server.port,
        claimed: true,
      },
      select: { id: true },
    });
    if (competingClaim) {
      await this.expireRegistration(server.id, ownerId, "A different account claimed this endpoint first.");
      throw new Error("This server address has already been claimed.");
    }
    const code = createVerificationCode();
    const expiresAt = new Date(Date.now() + 15 * 60_000);
    const networkScope = platform === "VELOCITY" ? "PROXY_NETWORK" : "SERVER";
    const challenge: ChallengePayload = {
      codeHash: hashCode(code),
      codeHint: code.slice(-4),
      platform,
      networkScope,
      format: "MOTD",
    };

    const verification = await prisma.$transaction(async (tx) => {
      await tx.serverVerification.updateMany({
        where: { serverId, status: "PENDING" },
        data: { status: "EXPIRED" },
      });
      await tx.server.update({
        where: { id: serverId },
        data: {
          verificationStatus: "PENDING",
          verificationScope: platform === "VELOCITY" ? "PROXY_NETWORK" : "SERVER",
          claimed: false,
        },
      });
      return tx.serverVerification.create({
        data: {
          serverId,
          provider: `${platform}_MOTD`,
          challenge: challenge as unknown as Prisma.InputJsonValue,
          expiresAt,
        },
      });
    });

    return {
      id: verification.id,
      serverId,
      code,
      platform,
      networkScope,
      expiresAt,
      motdText: `[${code}]`,
      downstreamVerificationRequired: platform !== "VELOCITY",
    };
  }

  async getOwned(serverId: string, ownerId: string) {
    const verification = await prisma.serverVerification.findFirst({
      where: { serverId, server: { ownerId } },
      orderBy: { createdAt: "desc" },
    });
    if (!verification) throw new Error("Server verification not found.");
    const challenge = challengeOf(verification);
    const expired =
      verification.status === "PENDING" &&
      verification.expiresAt !== null &&
      verification.expiresAt <= new Date();
    if (expired) {
      await prisma.serverVerification.update({
        where: { id: verification.id },
        data: { status: "EXPIRED" },
      });
    }
    return {
      id: verification.id,
      serverId,
      status: expired ? "EXPIRED" : verification.status,
      platform: challenge.platform,
      networkScope: challenge.networkScope,
      codeHint: challenge.codeHint,
      expiresAt: verification.expiresAt,
      evidence: verification.evidence,
      downstreamVerificationRequired: challenge.platform !== "VELOCITY",
    };
  }

  async verify(serverId: string, ownerId: string, requestId?: string) {
    const verification = await prisma.serverVerification.findFirst({
      where: { serverId, server: { ownerId }, status: "PENDING" },
      include: { server: true },
      orderBy: { createdAt: "desc" },
    });
    if (!verification) throw new Error("Pending server verification not found.");
    if (verification.expiresAt && verification.expiresAt <= new Date()) {
      await prisma.serverVerification.update({
        where: { id: verification.id },
        data: { status: "EXPIRED" },
      });
      throw new Error("The verification code has expired.");
    }

    const status = await this.ping(verification.server.hostname, verification.server.port);
    const candidates = status.motd.toUpperCase().match(CODE_PATTERN) ?? [];
    const expectedHash = challengeOf(verification).codeHash;
    const matched = candidates.some((candidate) => hashCode(candidate) === expectedHash);
    if (!matched) {
      await prisma.serverVerification.update({
        where: { id: verification.id },
        data: {
          evidence: {
            checkedAt: new Date().toISOString(),
            motdObserved: status.motd.slice(0, 500),
            ...((verification.evidence as object | null)
              ? { pluginHandshake: verification.evidence as object }
              : {}),
          },
        },
      });
      throw new Error("The verification code was not found in the public server MOTD.");
    }

    const priorEvidence = verification.evidence as object | null;
    const evidence = {
      checkedAt: new Date().toISOString(),
      method: "MINECRAFT_STATUS_MOTD",
      motdObserved: status.motd.slice(0, 500),
      ...(status.versionName !== undefined ? { versionName: status.versionName } : {}),
      ...(status.onlinePlayers !== undefined ? { onlinePlayers: status.onlinePlayers } : {}),
      ...(status.maxPlayers !== undefined ? { maxPlayers: status.maxPlayers } : {}),
      ...(priorEvidence ? { pluginHandshake: priorEvidence } : {}),
    };
    const challenge = challengeOf(verification);
    try {
      const outcome = await prisma.$transaction(
        async (tx) => {
          const current = await tx.server.findFirst({
            where: { id: serverId, ownerId },
            select: {
              id: true,
              edition: true,
              normalizedHostname: true,
              port: true,
              claimed: true,
              verificationStatus: true,
            },
          });
          if (!current || current.verificationStatus === "EXPIRED") {
            return { conflict: true as const };
          }
          const competingClaim = await tx.server.findFirst({
            where: {
              id: { not: current.id },
              edition: current.edition,
              normalizedHostname: current.normalizedHostname,
              port: current.port,
              claimed: true,
            },
            select: { id: true },
          });
          if (competingClaim) {
            await tx.serverVerification.updateMany({
              where: { serverId, status: "PENDING" },
              data: { status: "EXPIRED" },
            });
            await tx.server.update({
              where: { id: serverId },
              data: { claimed: false, verificationStatus: "EXPIRED", publicListing: false },
            });
            await tx.auditLog.create({
              data: {
                actorId: ownerId,
                action: "server.registration.expired_by_claim",
                entityType: "Server",
                entityId: serverId,
                requestId,
                reason: "A different account completed ownership verification first.",
              },
            });
            return { conflict: true as const };
          }

          const verified = await tx.serverVerification.updateMany({
            where: { id: verification.id, status: "PENDING" },
            data: { status: "VERIFIED", evidence },
          });
          if (verified.count !== 1) return { conflict: true as const };
          await tx.server.update({
            where: { id: serverId },
            data: {
              claimed: true,
              verificationStatus: "VERIFIED",
              online: true,
              playerCount: status.onlinePlayers,
              maxPlayers: status.maxPlayers,
            },
          });

          const competitors = await tx.server.findMany({
            where: {
              id: { not: serverId },
              edition: current.edition,
              normalizedHostname: current.normalizedHostname,
              port: current.port,
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
                data: {
                  verificationStatus: "EXPIRED",
                  publicListing: false,
                },
              }),
              tx.serverVerification.updateMany({
                where: { serverId: { in: competitorIds }, status: "PENDING" },
                data: { status: "EXPIRED" },
              }),
              tx.integrationApiKey.updateMany({
                where: { serverId: { in: competitorIds }, revokedAt: null },
                data: { revokedAt: new Date() },
              }),
              ...competitorIds.map((id) =>
                tx.auditLog.create({
                  data: {
                    actorId: ownerId,
                    action: "server.registration.expired_by_claim",
                    entityType: "Server",
                    entityId: id,
                    requestId,
                    reason: "Another account verified ownership of the same public endpoint.",
                    afterSnapshot: { verificationStatus: "EXPIRED", claimed: false },
                  },
                }),
              ),
            ]);
          }
          await tx.auditLog.create({
            data: {
              actorId: ownerId,
              action: "server.registration.claimed",
              entityType: "Server",
              entityId: serverId,
              requestId,
              afterSnapshot: {
                verificationStatus: "VERIFIED",
                claimed: true,
                expiredCompetingRegistrations: competitorIds.length,
              },
            },
          });
          return { conflict: false as const };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      if (outcome.conflict) {
        throw new Error("This server address has already been claimed.");
      }
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === "P2002" || error.code === "P2034")
      ) {
        const expired = await this.expireRegistration(
          serverId,
          ownerId,
          "A concurrent ownership verification completed first.",
          requestId,
        );
        if (expired) throw new Error("This server address has already been claimed.");
        throw new Error("Server verification is already being processed. Try again.");
      }
      throw error;
    }
    return {
      status: "VERIFIED" as const,
      serverId,
      networkScope: challenge.networkScope,
      downstreamVerificationRequired: challenge.platform !== "VELOCITY",
      verifiedAt: evidence.checkedAt,
    };
  }

  private async expireRegistration(
    serverId: string,
    ownerId: string,
    reason: string,
    requestId?: string,
  ) {
    return prisma.$transaction(async (tx) => {
      const server = await tx.server.findFirst({
        where: { id: serverId, ownerId, claimed: false },
        select: { id: true, edition: true, normalizedHostname: true, port: true },
      });
      if (!server) return false;
      const competingClaim = await tx.server.findFirst({
        where: {
          id: { not: serverId },
          edition: server.edition,
          normalizedHostname: server.normalizedHostname,
          port: server.port,
          claimed: true,
        },
        select: { id: true },
      });
      if (!competingClaim) return false;
      await Promise.all([
        tx.serverVerification.updateMany({
          where: { serverId, status: "PENDING" },
          data: { status: "EXPIRED" },
        }),
        tx.server.updateMany({
          where: { id: serverId, ownerId, claimed: false },
          data: { verificationStatus: "EXPIRED", publicListing: false },
        }),
        tx.integrationApiKey.updateMany({
          where: { serverId, revokedAt: null },
          data: { revokedAt: new Date() },
        }),
        tx.auditLog.create({
          data: {
            actorId: ownerId,
            action: "server.registration.expired_by_claim",
            entityType: "Server",
            entityId: serverId,
            requestId,
            reason,
            afterSnapshot: { verificationStatus: "EXPIRED", claimed: false },
          },
        }),
      ]);
      return true;
    });
  }

  async pluginHandshake(input: {
    code: string;
    platform: VerificationPlatform;
    pluginVersion: string;
    publicAddress?: string;
  }) {
    const recent = await prisma.serverVerification.findMany({
      where: { status: "PENDING", expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    const verification = recent.find(
      (item) =>
        challengeOf(item).codeHash === hashCode(input.code) &&
        challengeOf(item).platform === input.platform,
    );
    if (!verification) throw new Error("The verification code is invalid or expired.");
    await prisma.serverVerification.update({
      where: { id: verification.id },
      data: {
        evidence: {
          pluginHandshakeAt: new Date().toISOString(),
          platform: input.platform,
          pluginVersion: input.pluginVersion,
          ...(input.publicAddress ? { publicAddress: input.publicAddress } : {}),
        },
      },
    });
    return {
      accepted: true,
      status: "PENDING",
      networkScope: challengeOf(verification).networkScope,
      message: "Handshake accepted. Nortix still needs to find the code in the public MOTD.",
    };
  }

  async pluginStatus(code: string, platform: VerificationPlatform) {
    const recent = await prisma.serverVerification.findMany({
      where: { createdAt: { gt: new Date(Date.now() - 24 * 60 * 60_000) } },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    const verification = recent.find(
      (item) =>
        challengeOf(item).codeHash === hashCode(code) &&
        challengeOf(item).platform === platform,
    );
    if (!verification) throw new Error("The verification code is invalid or expired.");
    return {
      status: verification.status,
      networkScope: challengeOf(verification).networkScope,
      downstreamVerificationRequired: platform !== "VELOCITY",
    };
  }
}
