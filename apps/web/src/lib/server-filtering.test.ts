import { describe, expect, it } from "vitest";
import {
  filterServers,
  getServerFilterOptions,
  sortServersByCategory,
  type FilterableServer,
} from "./server-filtering";

const servers: FilterableServer[] = [
  {
    name: "Skyblock X",
    description: "Island progression",
    edition: "JAVA",
    categories: ["Skyblock", "Economy"],
    versions: ["1.20.4", "1.21"],
    tags: ["Friendly"],
  },
  {
    name: "Java Survival",
    description: "Community survival",
    edition: "JAVA",
    categories: ["Survival"],
    versions: ["1.21"],
    tags: ["Friendly"],
  },
];

describe("server filtering", () => {
  it("builds unique, naturally sorted category and version options", () => {
    expect(getServerFilterOptions(servers)).toEqual({
      categories: ["Economy", "Skyblock", "Survival"],
      versions: ["1.20.4", "1.21"],
    });
  });

  it("normalizes reported version labels before adding catalog options", () => {
    expect(
      getServerFilterOptions([
        {
          ...servers[0]!,
          versions: ["Requires MC 1.8 / 1.21", "Paper 1.21.4"],
        },
      ]).versions,
    ).toEqual(["1.8", "1.21", "1.21.4"]);
  });

  it("combines search, category, and exact version filters", () => {
    expect(
      filterServers(servers, { search: "island", category: "Skyblock", version: "1.21" }),
    ).toEqual([servers[0]]);
    expect(
      filterServers(servers, { search: "", category: "Survival", version: "1.20.4" }),
    ).toEqual([]);
  });

  it("orders servers by primary category and then by name", () => {
    expect(
      sortServersByCategory([
        servers[1]!,
        { ...servers[0]!, name: "Alpha Skyblock" },
        servers[0]!,
      ]).map((server) => server.name),
    ).toEqual(["Alpha Skyblock", "Skyblock X", "Java Survival"]);
  });
});
