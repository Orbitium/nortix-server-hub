import { describe, expect, it } from "vitest";
import { ServerInputSchema } from "./index";

const registration = {
  name: "Example Network",
  hostname: "play.example.net",
  port: 25565,
  description:
    "A friendly survival network with custom quests, community events, and balanced progression.",
  edition: "JAVA" as const,
  versions: ["1.21"],
  categories: ["Survival"],
  tags: ["friendly"],
};

describe("server registration input", () => {
  it("accepts optional profile capacity and a custom HTTPS banner", () => {
    expect(
      ServerInputSchema.safeParse({
        ...registration,
        maxPlayers: 1_000,
        bannerUrl: "https://cdn.example.net/server-banner.png",
      }).success,
    ).toBe(true);
  });

  it("rejects unsafe or out-of-range profile fields", () => {
    expect(ServerInputSchema.safeParse({ ...registration, maxPlayers: 0 }).success).toBe(false);
    expect(
      ServerInputSchema.safeParse({
        ...registration,
        bannerUrl: "javascript:alert(1)",
      }).success,
    ).toBe(false);
  });
});
