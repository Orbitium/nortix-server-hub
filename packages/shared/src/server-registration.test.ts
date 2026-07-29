import { describe, expect, it } from "vitest";
import {
  DeleteServerRegistrationSchema,
  ServerAddressValidationSchema,
  ServerInputSchema,
} from "./index";

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

  it("accepts only Java Edition registrations and address checks", () => {
    expect(ServerInputSchema.safeParse({ ...registration, edition: "JAVA" }).success).toBe(true);
    expect(ServerInputSchema.safeParse({ ...registration, edition: "BEDROCK" }).success).toBe(false);
    expect(
      ServerAddressValidationSchema.safeParse({
        hostname: registration.hostname,
        port: 19132,
        edition: "BEDROCK",
      }).success,
    ).toBe(false);
  });

  it("requires a reason and explicit name for registration deletion", () => {
    expect(
      DeleteServerRegistrationSchema.safeParse({
        confirmationName: "Example Network",
        reason: "Registered the wrong public endpoint.",
      }).success,
    ).toBe(true);
    expect(
      DeleteServerRegistrationSchema.safeParse({
        confirmationName: "Example Network",
        reason: "oops",
      }).success,
    ).toBe(false);
  });
});
