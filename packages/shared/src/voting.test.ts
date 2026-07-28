import { describe, expect, it } from "vitest";
import { ServerVoteInputSchema } from "./index.js";

describe("server vote contracts", () => {
  it("requires a bounded Turnstile token", () => {
    expect(
      ServerVoteInputSchema.parse({ vote: true, turnstileToken: "verified-token" }),
    ).toEqual({ vote: true, turnstileToken: "verified-token" });
    expect(() => ServerVoteInputSchema.parse({ vote: true })).toThrow();
    expect(() =>
      ServerVoteInputSchema.parse({
        vote: true,
        turnstileToken: "token",
        playerId: "another-user",
      }),
    ).toThrow();
  });
});
