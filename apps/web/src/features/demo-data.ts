export type DemoServer = {
  id: string;
  name: string;
  slug: string;
  description: string;
  versions: string[];
  edition: "JAVA" | "BEDROCK";
  categories: string[];
  tags: string[];
  online: boolean;
  playerCount: number;
  maxPlayers: number;
  verified: boolean;
  rating: number;
  art: number;
};

export type DemoMilestone = {
  id: string;
  title: string;
  description: string;
  rewardCents: number;
  sparks: number;
  duration: string;
};

export type DemoCampaign = {
  id: string;
  title: string;
  description: string;
  server: DemoServer;
  version: string;
  rewardCents: number;
  sparks: number;
  duration: string;
  participants: number;
  difficulty: "Easy" | "Moderate" | "Advanced";
  region: string;
  language: string;
  category: string;
  status: "ACTIVE" | "SCHEDULED";
  milestones: DemoMilestone[];
};

const serverBlueprints: Array<Omit<DemoServer, "id" | "slug" | "art"> & { slug: string }> = [
  {
    name: "Skyblock X",
    slug: "skyblock-x",
    description: "Build a floating empire with evolving islands and weekly co-op challenges.",
    versions: ["1.20.4", "1.21"],
    edition: "JAVA",
    categories: ["Skyblock", "Economy"],
    tags: ["Seasonal", "Co-op"],
    online: true,
    playerCount: 1842,
    maxPlayers: 5000,
    verified: true,
    rating: 4.8,
  },
  {
    name: "PrisonCraft",
    slug: "prisoncraft",
    description: "Progress through deep mines, fair ranks, and team-focused events.",
    versions: ["1.20.4"],
    edition: "JAVA",
    categories: ["Prison", "Economy"],
    tags: ["Progression", "Events"],
    online: true,
    playerCount: 934,
    maxPlayers: 3000,
    verified: true,
    rating: 4.6,
  },
  {
    name: "Lifesteal SMP",
    slug: "lifesteal-smp",
    description: "A seasonal survival world where every alliance changes your story.",
    versions: ["1.21"],
    edition: "JAVA",
    categories: ["SMP", "PvP"],
    tags: ["Seasonal", "Competitive"],
    online: true,
    playerCount: 1260,
    maxPlayers: 4000,
    verified: true,
    rating: 4.7,
  },
  {
    name: "Factions Legacy",
    slug: "factions-legacy",
    description: "Classic factions strategy rebuilt with modern combat and transparent rules.",
    versions: ["1.20.4"],
    edition: "JAVA",
    categories: ["Factions", "PvP"],
    tags: ["Strategy", "Seasons"],
    online: true,
    playerCount: 719,
    maxPlayers: 2500,
    verified: true,
    rating: 4.5,
  },
  {
    name: "Arcane Realms",
    slug: "arcane-realms",
    description: "A handcrafted fantasy RPG with spell schools, quests, and raid bosses.",
    versions: ["1.20.1"],
    edition: "JAVA",
    categories: ["RPG", "Adventure"],
    tags: ["Quests", "Custom mobs"],
    online: true,
    playerCount: 581,
    maxPlayers: 1800,
    verified: true,
    rating: 4.9,
  },
  {
    name: "Bedwars Classic",
    slug: "bedwars-classic",
    description: "Fast, competitive Bedwars with balanced maps and ranked queues.",
    versions: ["1.8.9", "1.21"],
    edition: "JAVA",
    categories: ["Minigames", "PvP"],
    tags: ["Ranked", "Teams"],
    online: true,
    playerCount: 2150,
    maxPlayers: 6000,
    verified: true,
    rating: 4.6,
  },
  {
    name: "OneBlock Journey",
    slug: "oneblock-journey",
    description: "Grow one block into a thriving world through guided chapters.",
    versions: ["1.21"],
    edition: "BEDROCK",
    categories: ["OneBlock", "Co-op"],
    tags: ["Chapters", "Friendly"],
    online: true,
    playerCount: 443,
    maxPlayers: 1200,
    verified: true,
    rating: 4.7,
  },
  {
    name: "Vanilla Frontier",
    slug: "vanilla-frontier",
    description: "Community survival with land claims, expeditions, and no pay-to-win.",
    versions: ["1.21"],
    edition: "JAVA",
    categories: ["Survival", "Vanilla"],
    tags: ["Community", "Exploration"],
    online: true,
    playerCount: 1084,
    maxPlayers: 3000,
    verified: true,
    rating: 4.9,
  },
  {
    name: "Copper Kingdoms",
    slug: "copper-kingdoms",
    description: "Build a kingdom, negotiate trade routes, and defend your borders.",
    versions: ["1.20.4"],
    edition: "JAVA",
    categories: ["Towny", "Strategy"],
    tags: ["Politics", "Economy"],
    online: false,
    playerCount: 0,
    maxPlayers: 1200,
    verified: true,
    rating: 4.4,
  },
  {
    name: "Redstone Labs",
    slug: "redstone-labs",
    description: "A collaborative technical server for ambitious farms and engineering.",
    versions: ["1.21"],
    edition: "JAVA",
    categories: ["Technical", "Creative"],
    tags: ["Builders", "Engineering"],
    online: true,
    playerCount: 206,
    maxPlayers: 800,
    verified: true,
    rating: 4.8,
  },
  {
    name: "Ember Isles",
    slug: "ember-isles",
    description: "Explore volcanic islands, discover relics, and master compact dungeons.",
    versions: ["1.21"],
    edition: "BEDROCK",
    categories: ["Adventure", "Dungeons"],
    tags: ["Bosses", "Lore"],
    online: true,
    playerCount: 378,
    maxPlayers: 900,
    verified: true,
    rating: 4.6,
  },
  {
    name: "CozyCraft",
    slug: "cozycraft",
    description: "Calm social survival centered on building and community events.",
    versions: ["1.20.4", "1.21"],
    edition: "JAVA",
    categories: ["Survival", "Community"],
    tags: ["Relaxed", "Building"],
    online: true,
    playerCount: 662,
    maxPlayers: 1800,
    verified: true,
    rating: 4.8,
  },
];

export const servers: DemoServer[] = serverBlueprints.map((server, index) => ({
  ...server,
  id: `server-${index + 1}`,
  art: index % 8,
}));

const titles = [
  "First island experience",
  "Prison onboarding polish",
  "Season launch survival test",
  "Faction tutorial expedition",
  "Arcane academy playtest",
  "Ranked Bedwars queue test",
  "OneBlock chapter one",
  "New frontier expedition",
];

export const campaigns: DemoCampaign[] = titles.map((title, index) => {
  const server = servers[index]!;
  return {
    id: `campaign-${index + 1}`,
    title,
    description: `Help ${server.name} test its first-session experience and share specific, useful feedback.`,
    server,
    version: server.versions.at(-1)!,
    rewardCents: 0,
    sparks: Math.max(65, 100 - index * 5),
    duration: `${35 + index * 5}–${55 + index * 5} min`,
    participants: 42 + index * 17,
    difficulty: index < 3 ? "Easy" : index < 6 ? "Moderate" : "Advanced",
    region: index % 3 === 0 ? "US · CA · GB" : "Worldwide",
    language: "English",
    category: ["Onboarding", "Retention", "Gameplay", "Tutorial"][index % 4]!,
    status: "ACTIVE",
    milestones: [
      {
        id: `m-${index}-1`,
        title: "Connect and begin",
        description: "Join using the provided server address and start the welcome path.",
        rewardCents: 0,
        sparks: 25,
        duration: "5 min",
      },
      {
        id: `m-${index}-2`,
        title: "Complete the welcome path",
        description: "Finish the guided tutorial and submit the completion screen.",
        rewardCents: 0,
        sparks: 35,
        duration: `${20 + index * 3} min`,
      },
      {
        id: `m-${index}-3`,
        title: "Share structured feedback",
        description: "Tell the team what was clear, confusing, smooth, or frustrating.",
        rewardCents: 0,
        sparks: Math.max(5, 40 - index * 5),
        duration: "10 min",
      },
    ],
  };
});

export const leaderboard = [
  ["MossyBeacon", "Elite Tester", 982, 46],
  ["QuartzFox", "Veteran Tester", 944, 41],
  ["PixelHarbor", "Veteran Tester", 912, 39],
  ["RedstoneRae", "Trusted Tester", 889, 37],
  ["VoidWalker", "Trusted Tester", 854, 34],
] as const;

export const cosmetics = [
  {
    id: "moss-frame",
    name: "Mossbound Frame",
    type: "Profile frame",
    price: 2200,
    rarity: "Rare",
    className: "cosmetic--moss",
  },
  {
    id: "void-card",
    name: "Voidglass Card",
    type: "Animated card",
    price: 4800,
    rarity: "Epic",
    className: "cosmetic--void",
  },
  {
    id: "forest-bg",
    name: "Moonlit Forest",
    type: "Profile background",
    price: 3200,
    rarity: "Rare",
    className: "cosmetic--forest",
  },
  {
    id: "signal-name",
    name: "Signal Pulse",
    type: "Name effect",
    price: 6000,
    rarity: "Epic",
    className: "cosmetic--signal",
  },
  {
    id: "stamp-page",
    name: "Summer Stamps",
    type: "Collection page",
    price: 2800,
    rarity: "Seasonal",
    className: "cosmetic--summer",
  },
];
