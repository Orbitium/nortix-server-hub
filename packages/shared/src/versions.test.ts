import { describe, expect, it } from "vitest";
import { extractMinecraftVersions, normalizeMinecraftVersions } from "./index.js";

describe("Minecraft version normalization", () => {
  it("removes server software and requirement text", () => {
    expect(extractMinecraftVersions("Requires MC 1.8 / 1.21")).toEqual(["1.8", "1.21"]);
    expect(extractMinecraftVersions("Paper 1.21.4 (protocol 769)")).toEqual(["1.21.4"]);
  });

  it("handles ranges, removes duplicates, and naturally sorts versions", () => {
    expect(
      normalizeMinecraftVersions([
        "Velocity: 1.21.4 - 1.21.5",
        "Supports 1.8.x through 1.21.4",
      ]),
    ).toEqual(["1.8", "1.21.4", "1.21.5"]);
  });

  it("does not expose arbitrary reported text or partial dotted numbers", () => {
    expect(normalizeMinecraftVersions(["Paper build 248", "address 1.21.4.12"])).toEqual([]);
  });
});
