import { prisma } from "@nortix/database";
import type { FastifyBaseLogger } from "fastify";
import type { Env } from "../../config/env.js";
import { McsrvstatClient, McsrvstatRequestError } from "./mcsrvstat-client.js";

const discoveredServerDescription = (edition: "JAVA" | "BEDROCK") =>
  `A public Minecraft ${edition === "JAVA" ? "Java" : "Bedrock"} server monitored through mcsrvstat.us. This listing has not been claimed or verified by Nortix.`;

const toPublicServer = (server: {
  id: string;
  slug: string;
  displayName: string;
  hostname: string;
  port: number;
  edition: "JAVA" | "BEDROCK";
  online: boolean;
  playerCount: number | null;
  maxPlayers: number | null;
  version: string | null;
  lastCheckedAt: Date | null;
}) => ({
  id: server.id,
  slug: server.slug,
  name: server.displayName,
  description: discoveredServerDescription(server.edition),
  hostname: server.hostname,
  port: server.port,
  versions: server.version ? [server.version] : [],
  edition: server.edition,
  categories: ["Public server"],
  tags: [],
  logoUrl: null,
  bannerUrl: null,
  screenshotUrls: [],
  discordUrl: null,
  websiteUrl: null,
  verificationStatus: "UNVERIFIED",
  source: "DISCOVERED" as const,
  online: server.online,
  playerCount: server.playerCount,
  maxPlayers: server.maxPlayers,
  rating: null,
  reviewCount: 0,
  activeCampaignCount: 0,
  crackedAccountLinkingAvailable: false,
  lastCheckedAt: server.lastCheckedAt?.toISOString() ?? null,
});

const shuffle = <T>(items: T[]) => {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex]!, result[index]!];
  }
  return result;
};

export class ServerDiscoveryService {
  private timer?: NodeJS.Timeout;
  private running = false;
  private stopped = false;
  private pausedUntil = 0;
  private readonly client: McsrvstatClient;

  constructor(
    private readonly env: Env,
    private readonly log: FastifyBaseLogger,
  ) {
    this.client = new McsrvstatClient(env.MCSRVSTAT_USER_AGENT);
  }

  async list(search = "") {
    const servers = await prisma.discoveredServer.findMany({
      where: {
        enabled: true,
        ...(search
          ? {
              OR: [
                { displayName: { contains: search, mode: "insensitive" } },
                { hostname: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        slug: true,
        displayName: true,
        hostname: true,
        port: true,
        edition: true,
        online: true,
        playerCount: true,
        maxPlayers: true,
        version: true,
        lastCheckedAt: true,
      },
    });
    return shuffle(servers).map(toPublicServer);
  }

  async getBySlug(slug: string) {
    const server = await prisma.discoveredServer.findFirst({
      where: { slug, enabled: true },
      select: {
        id: true,
        slug: true,
        displayName: true,
        hostname: true,
        port: true,
        edition: true,
        online: true,
        playerCount: true,
        maxPlayers: true,
        version: true,
        lastCheckedAt: true,
      },
    });
    return server
      ? {
          ...toPublicServer(server),
          campaigns: [],
          reviews: [],
        }
      : null;
  }

  start() {
    if (!this.env.DISCOVERY_SCAN_ENABLED || this.timer) return;
    this.stopped = false;
    this.schedule(1_000);
  }

  stop() {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;
  }

  private schedule(delay: number) {
    if (this.stopped) return;
    this.timer = setTimeout(() => {
      const startedAt = Date.now();
      void this.tick().finally(() => {
        const elapsed = Date.now() - startedAt;
        this.schedule(Math.max(0, this.env.DISCOVERY_SCAN_SPACING_MS - elapsed));
      });
    }, delay);
    this.timer.unref();
  }

  private async tick() {
    if (this.running || Date.now() < this.pausedUntil) return;
    this.running = true;
    try {
      const now = new Date();
      const candidate = await prisma.discoveredServer.findFirst({
        where: { enabled: true, nextCheckAt: { lte: now } },
        orderBy: [{ nextCheckAt: "asc" }, { id: "asc" }],
      });
      if (!candidate) return;

      const nextCheckAt = new Date(
        now.getTime() + this.env.DISCOVERY_SCAN_INTERVAL_MINUTES * 60_000,
      );
      const claim = await prisma.discoveredServer.updateMany({
        where: {
          id: candidate.id,
          enabled: true,
          nextCheckAt: candidate.nextCheckAt,
        },
        data: { nextCheckAt },
      });
      if (claim.count !== 1) return;

      try {
        const status = await this.client.getStatus({
          hostname: candidate.hostname,
          port: candidate.port,
          edition: candidate.edition,
        });
        const checkedAt = new Date();
        await prisma.discoveredServer.update({
          where: { id: candidate.id },
          data: {
            online: status.online,
            playerCount: status.playerCount,
            maxPlayers: status.maxPlayers,
            version: status.version,
            lastCheckedAt: checkedAt,
            lastOnlineAt: status.online ? checkedAt : candidate.lastOnlineAt,
            consecutiveFailures: 0,
            lastErrorCode: null,
          },
        });
      } catch (error) {
        const code =
          error instanceof McsrvstatRequestError ? error.code : "UNEXPECTED_ERROR";
        if (code === "RATE_LIMITED") {
          this.pausedUntil = Date.now() + 10 * 60_000;
          this.log.warn("mcsrvstat.us rate limit reached; discovery scans paused for ten minutes");
        }
        await prisma.discoveredServer.update({
          where: { id: candidate.id },
          data: {
            consecutiveFailures: { increment: 1 },
            lastErrorCode: code,
            nextCheckAt:
              code === "RATE_LIMITED"
                ? new Date(Date.now() + 20 * 60_000)
                : nextCheckAt,
          },
        });
      }
    } catch (error) {
      this.log.error({ err: error }, "public server discovery scan failed");
    } finally {
      this.running = false;
    }
  }
}
