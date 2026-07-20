import { describe, expect, it, vi } from "vitest";
import { McsrvstatClient } from "./mcsrvstat-client.js";
import type { McsrvstatRequestError } from "./mcsrvstat-client.js";

describe("McsrvstatClient", () => {
  it("uses the edition endpoint, address, and descriptive user agent", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          online: true,
          players: { online: 12, max: 100 },
          version: "\u00A7aPaper 1.21.4",
        }),
        { status: 200 },
      ),
    );
    const client = new McsrvstatClient("NortixServerHub/1.0 test", request);

    await expect(
      client.getStatus({ hostname: "play.example.net", port: 19132, edition: "BEDROCK" }),
    ).resolves.toEqual({
      online: true,
      playerCount: 12,
      maxPlayers: 100,
      version: "Paper 1.21.4",
    });
    expect(request).toHaveBeenCalledWith(
      "https://api.mcsrvstat.us/bedrock/3/play.example.net%3A19132",
      expect.objectContaining({
        headers: expect.objectContaining({
          "User-Agent": "NortixServerHub/1.0 test",
        }),
      }),
    );
  });

  it("does not retry or expose an invalid response", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(
      new Response("not json", { status: 200 }),
    );
    const client = new McsrvstatClient("NortixServerHub/1.0 test", request);

    await expect(
      client.getStatus({ hostname: "play.example.net", port: 25565, edition: "JAVA" }),
    ).rejects.toMatchObject({ code: "INVALID_RESPONSE" } satisfies Partial<McsrvstatRequestError>);
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("surfaces rate limiting so the scheduler can pause globally", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response("", { status: 429 }));
    const client = new McsrvstatClient("NortixServerHub/1.0 test", request);

    await expect(
      client.getStatus({ hostname: "play.example.net", port: 25565, edition: "JAVA" }),
    ).rejects.toMatchObject({ code: "RATE_LIMITED" } satisfies Partial<McsrvstatRequestError>);
  });
});
