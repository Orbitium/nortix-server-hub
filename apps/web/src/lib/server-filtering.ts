import { normalizeMinecraftVersions } from "@nortix/shared";

export type FilterableServer = {
  name: string;
  description: string;
  edition: string;
  categories: string[];
  versions: string[];
  tags: string[];
};

export type ServerFilters = {
  search: string;
  category: string;
  version: string;
};

const optionCollator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });

export function getServerFilterOptions(servers: FilterableServer[]) {
  return {
    categories: [
      ...new Set(servers.flatMap((server) => server.categories).filter(Boolean)),
    ].sort(optionCollator.compare),
    versions: [
      ...new Set(servers.flatMap((server) => normalizeMinecraftVersions(server.versions))),
    ].sort(optionCollator.compare),
  };
}

export function filterServers<T extends FilterableServer>(
  servers: T[],
  { search, category, version }: ServerFilters,
) {
  const query = search.trim().toLowerCase();

  return servers.filter((server) => {
    const searchableText = [
      server.name,
      server.description,
      server.edition,
      ...server.categories,
      ...server.versions,
      ...server.tags,
    ]
      .join(" ")
      .toLowerCase();

    return (
      (category === "ALL" || server.categories.includes(category)) &&
      (version === "ALL" || normalizeMinecraftVersions(server.versions).includes(version)) &&
      (!query || searchableText.includes(query))
    );
  });
}
