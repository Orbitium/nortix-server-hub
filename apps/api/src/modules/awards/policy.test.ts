import { describe, expect, it } from "vitest";
import { SERVER_AWARD_CATALOG, serverAwardFor } from "./policy.js";

describe("server award policy", () => {
  it("defines unique award kinds with backend-owned positive prices", () => {
    expect(new Set(SERVER_AWARD_CATALOG.map((award) => award.kind)).size).toBe(
      SERVER_AWARD_CATALOG.length,
    );
    expect(SERVER_AWARD_CATALOG.every((award) => award.cost > 0)).toBe(true);
  });

  it("keeps the requested premium GOAT price", () => {
    expect(serverAwardFor("GOAT")?.cost).toBe(1_000);
  });
});
