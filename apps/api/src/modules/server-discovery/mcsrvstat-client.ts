import { z } from "zod";

const StatusResponseSchema = z
  .object({
    online: z.boolean(),
    players: z
      .object({
        online: z.number().int().nonnegative().optional(),
        max: z.number().int().nonnegative().optional(),
      })
      .optional(),
    version: z.string().optional(),
  })
  .passthrough();

export type DiscoveryEdition = "JAVA" | "BEDROCK";

export type MinecraftServerStatus = {
  online: boolean;
  playerCount: number | null;
  maxPlayers: number | null;
  version: string | null;
};

export class McsrvstatRequestError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

const safeStatusText = (value: string | undefined) => {
  if (!value) return null;
  const cleaned = value
    .replace(/\u00A7[0-9A-FK-OR]/gi, "")
    .replace(/<[^>]*>/g, "")
    .split("")
    .map((character) => {
      const code = character.charCodeAt(0);
      return code < 32 || code === 127 ? " " : character;
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
  return cleaned || null;
};

export class McsrvstatClient {
  constructor(
    private readonly userAgent: string,
    private readonly request: typeof fetch = fetch,
  ) {}

  async getStatus(input: {
    hostname: string;
    port: number;
    edition: DiscoveryEdition;
  }): Promise<MinecraftServerStatus> {
    const prefix = input.edition === "BEDROCK" ? "bedrock/3" : "3";
    const address = encodeURIComponent(`${input.hostname}:${input.port}`);
    let response: Response;
    try {
      response = await this.request(`https://api.mcsrvstat.us/${prefix}/${address}`, {
        headers: {
          Accept: "application/json",
          "User-Agent": this.userAgent,
        },
        signal: AbortSignal.timeout(8_000),
      });
    } catch {
      throw new McsrvstatRequestError("NETWORK_ERROR", "The status request failed.");
    }

    if (!response.ok) {
      throw new McsrvstatRequestError(
        response.status === 429 ? "RATE_LIMITED" : `HTTP_${response.status}`,
        `The status API returned HTTP ${response.status}.`,
      );
    }

    const body = await response.text();
    if (body.length > 100_000) {
      throw new McsrvstatRequestError("RESPONSE_TOO_LARGE", "The status response was too large.");
    }

    let parsed: z.infer<typeof StatusResponseSchema>;
    try {
      parsed = StatusResponseSchema.parse(JSON.parse(body));
    } catch {
      throw new McsrvstatRequestError("INVALID_RESPONSE", "The status response was invalid.");
    }

    return {
      online: parsed.online,
      playerCount: parsed.online ? (parsed.players?.online ?? null) : null,
      maxPlayers: parsed.online ? (parsed.players?.max ?? null) : null,
      version: safeStatusText(parsed.version),
    };
  }
}
