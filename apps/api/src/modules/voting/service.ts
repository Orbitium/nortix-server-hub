import { prisma, Prisma } from "@nortix/database";

const DAY_MS = 86_400_000;
const MAX_DAILY_VOTES = 5;
const PLUGIN_FRESHNESS_MS = 10 * 60_000;
const MAX_REWARDED_SESSIONS_PER_HOUR = 5;

export const utcDay = (date = new Date()) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

const eligibleServerWhere = (now = new Date()) => ({
  publicListing: true,
  moderationStatus: "APPROVED" as const,
  verificationStatus: "VERIFIED" as const,
  pluginInstanceId: { not: null },
  pluginLastSeenAt: { gte: new Date(now.getTime() - PLUGIN_FRESHNESS_MS) },
});

export class VotingService {
  async list(userId: string) {
    const today = utcDay();
    const tomorrow = new Date(today.getTime() + DAY_MS);
    const [servers, votes] = await prisma.$transaction([
      prisma.server.findMany({
        where: eligibleServerWhere(),
        select: {
          id: true,
          slug: true,
          name: true,
          description: true,
          logoUrl: true,
          playerCount: true,
          maxPlayers: true,
          pluginLastSeenAt: true,
          rewardedVotingEnabled: true,
        },
        orderBy: [{ playerCount: "desc" }, { name: "asc" }],
      }),
      prisma.serverVote.findMany({
        where: { playerId: userId, voteDate: { gte: today, lt: tomorrow } },
        select: { serverId: true, createdAt: true },
      }),
    ]);
    const voteWeights = servers.length === 0
      ? []
      : await prisma.serverVote.groupBy({
          by: ["serverId"],
          where: { serverId: { in: servers.map((server) => server.id) } },
          _sum: { weight: true },
        });
    const voteWeightsByServer = new Map(
      voteWeights.map((vote) => [vote.serverId, vote._sum.weight ?? 0]),
    );
    const votedByServer = new Map(votes.map((vote) => [vote.serverId, vote.createdAt]));
    return {
      dailyLimit: MAX_DAILY_VOTES,
      votesUsed: votes.length,
      resetsAt: tomorrow.toISOString(),
      servers: servers.map((server) => ({
        ...server,
        voteCount: voteWeightsByServer.get(server.id) ?? 0,
        votedToday: votedByServer.has(server.id),
        votedAt: votedByServer.get(server.id)?.toISOString() ?? null,
      })),
    };
  }

  async vote(userId: string, serverId: string) {
    const today = utcDay();
    return prisma.$transaction(
      async (tx) => {
        const server = await tx.server.findFirst({
          where: { id: serverId, ...eligibleServerWhere() },
          select: { id: true },
        });
        if (!server) {
          throw new Error(
            "This server is not currently eligible for voting. Its Nortix plugin must be online.",
          );
        }
        const existing = await tx.serverVote.findUnique({
          where: { serverId_playerId_voteDate: { serverId, playerId: userId, voteDate: today } },
          select: { id: true },
        });
        if (existing) throw new Error("You already voted for this server today.");
        const votesUsed = await tx.serverVote.count({ where: { playerId: userId, voteDate: today } });
        if (votesUsed >= MAX_DAILY_VOTES) {
          throw new Error("You have used all 5 server votes for today.");
        }
        await tx.serverVote.create({
          data: { serverId, playerId: userId, voteDate: today, weight: 1 },
        });
        const voteTotal = await tx.serverVote.aggregate({
          where: { serverId },
          _sum: { weight: true },
        });
        return {
          voted: true,
          voteWeight: 1,
          voteCount: voteTotal._sum.weight ?? 0,
          votesUsed: votesUsed + 1,
          dailyLimit: MAX_DAILY_VOTES,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async startRewardedSession(
    userId: string,
    serverId: string,
    tokenHash: string,
    expiresAt: Date,
  ) {
    const today = utcDay();
    return prisma.$transaction(
      async (tx) => {
        const server = await tx.server.findFirst({
          where: {
            id: serverId,
            ...eligibleServerWhere(),
            rewardedVotingEnabled: true,
          },
          select: { id: true },
        });
        if (!server) {
          throw new Error("Rewarded voting is not available for this server.");
        }
        const [existingVote, votesUsed, recentSessions] = await Promise.all([
          tx.serverVote.findUnique({
            where: { serverId_playerId_voteDate: { serverId, playerId: userId, voteDate: today } },
            select: { id: true },
          }),
          tx.serverVote.count({ where: { playerId: userId, voteDate: today } }),
          tx.rewardedVoteSession.count({
            where: {
              playerId: userId,
              createdAt: { gte: new Date(Date.now() - 60 * 60_000) },
            },
          }),
        ]);
        if (existingVote) throw new Error("You already voted for this server today.");
        if (votesUsed >= MAX_DAILY_VOTES) {
          throw new Error("You have used all 5 server votes for today.");
        }
        if (recentSessions >= MAX_REWARDED_SESSIONS_PER_HOUR) {
          throw new Error("Rewarded voting is not currently available. Try again later.");
        }
        return tx.rewardedVoteSession.create({
          data: { serverId, playerId: userId, tokenHash, expiresAt },
          select: { id: true, expiresAt: true },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async redeemRewardedSession(
    userId: string,
    serverId: string,
    sessionId: string,
    tokenHash: string,
    requestId: string,
  ) {
    const today = utcDay();
    const now = new Date();
    return prisma.$transaction(
      async (tx) => {
        const session = await tx.rewardedVoteSession.findFirst({
          where: {
            id: sessionId,
            serverId,
            playerId: userId,
            tokenHash,
            consumedAt: null,
            expiresAt: { gt: now },
            server: {
              is: {
                ...eligibleServerWhere(now),
                rewardedVotingEnabled: true,
              },
            },
          },
          select: { id: true },
        });
        if (!session) throw new Error("This rewarded voting session is invalid or expired.");
        const [existingVote, votesUsed] = await Promise.all([
          tx.serverVote.findUnique({
            where: { serverId_playerId_voteDate: { serverId, playerId: userId, voteDate: today } },
            select: { id: true },
          }),
          tx.serverVote.count({ where: { playerId: userId, voteDate: today } }),
        ]);
        if (existingVote) throw new Error("You already voted for this server today.");
        if (votesUsed >= MAX_DAILY_VOTES) {
          throw new Error("You have used all 5 server votes for today.");
        }
        const consumed = await tx.rewardedVoteSession.updateMany({
          where: { id: session.id, consumedAt: null, expiresAt: { gt: now } },
          data: { consumedAt: now },
        });
        if (consumed.count !== 1) {
          throw new Error("This rewarded voting session is invalid or expired.");
        }
        const vote = await tx.serverVote.create({
          data: {
            serverId,
            playerId: userId,
            voteDate: today,
            weight: 2,
            rewardedVoteSessionId: session.id,
          },
          select: { id: true, weight: true },
        });
        await tx.auditLog.create({
          data: {
            actorId: userId,
            action: "server.vote.rewarded_granted",
            entityType: "ServerVote",
            entityId: vote.id,
            requestId,
            afterSnapshot: {
              serverId,
              weight: vote.weight,
              provider: "GOOGLE_AD_MANAGER",
              verification: "WEB_CLIENT_GRANT_EVENT",
            },
          },
        });
        const voteTotal = await tx.serverVote.aggregate({
          where: { serverId },
          _sum: { weight: true },
        });
        return {
          voted: true,
          voteWeight: vote.weight,
          voteCount: voteTotal._sum.weight ?? 0,
          votesUsed: votesUsed + 1,
          dailyLimit: MAX_DAILY_VOTES,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }
}
