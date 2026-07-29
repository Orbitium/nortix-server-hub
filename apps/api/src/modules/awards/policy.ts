import type { ServerAwardKind } from "@nortix/shared";

export const SERVER_AWARD_DAILY_LIMIT = 10;

export const SERVER_AWARD_CATALOG = [
  {
    kind: "LOVE_IT",
    name: "Love It",
    emoji: "❤️",
    cost: 100,
    description: "A heartfelt recommendation for a server you enjoy.",
  },
  {
    kind: "FIRE",
    name: "Fire",
    emoji: "🔥",
    cost: 200,
    description: "For a server or update that is on fire.",
  },
  {
    kind: "CROWN",
    name: "Crown",
    emoji: "👑",
    cost: 500,
    description: "Royal recognition from the community.",
  },
  {
    kind: "GOAT",
    name: "GOAT",
    emoji: "🐐",
    cost: 1_000,
    description: "For an all-time community favorite.",
  },
  {
    kind: "FUNNY",
    name: "Funny",
    emoji: "😂",
    cost: 200,
    description: "For a server that created a memorable laugh.",
  },
  {
    kind: "CLOWN",
    name: "Clown",
    emoji: "🤡",
    cost: 200,
    description: "A playful reaction to a chaotic moment.",
  },
  {
    kind: "DEAD",
    name: "Dead",
    emoji: "💀",
    cost: 200,
    description: "For moments that left the community speechless.",
  },
  {
    kind: "CIRCUS",
    name: "Circus",
    emoji: "🎪",
    cost: 500,
    description: "For spectacular community chaos.",
  },
  {
    kind: "SMART_DEV",
    name: "Smart Dev",
    emoji: "🧠",
    cost: 300,
    description: "Recognition for thoughtful development.",
  },
  {
    kind: "ADDICTING",
    name: "Addicting",
    emoji: "⚡",
    cost: 300,
    description: "For gameplay that keeps pulling players back.",
  },
  {
    kind: "BEAUTIFUL",
    name: "Beautiful",
    emoji: "🎨",
    cost: 300,
    description: "Recognition for excellent visual design.",
  },
] as const satisfies ReadonlyArray<{
  kind: ServerAwardKind;
  name: string;
  emoji: string;
  cost: number;
  description: string;
}>;

export const serverAwardFor = (kind: ServerAwardKind) =>
  SERVER_AWARD_CATALOG.find((award) => award.kind === kind);
