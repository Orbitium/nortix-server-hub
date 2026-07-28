import { prisma, Prisma } from "@nortix/database";

const DAY_MS = 86_400_000;
const MAX_DAILY_VOTES = 5;
const PLUGIN_FRESHNESS_MS = 10 * 60_000;

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
          _count: { select: { votes: true } },
        },
        orderBy: [{ playerCount: "desc" }, { name: "asc" }],
      }),
      prisma.serverVote.findMany({
        where: { playerId: userId, voteDate: { gte: today, lt: tomorrow } },
        select: { serverId: true, createdAt: true },
      }),
    ]);
    const votedByServer = new Map(votes.map((vote) => [vote.serverId, vote.createdAt]));
    return {
      dailyLimit: MAX_DAILY_VOTES,
      votesUsed: votes.length,
      resetsAt: tomorrow.toISOString(),
      servers: servers.map(({ _count, ...server }) => ({
        ...server,
        voteCount: _count.votes,
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
        await tx.serverVote.create({ data: { serverId, playerId: userId, voteDate: today } });
        const voteCount = await tx.serverVote.count({ where: { serverId } });
        return { voted: true, voteCount, votesUsed: votesUsed + 1, dailyLimit: MAX_DAILY_VOTES };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }
}
