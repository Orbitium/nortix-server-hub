export type CampaignMilestoneSuggestion = {
  metric: string;
  title: string;
  description: string;
  suggestedTarget: number;
  maximumTarget: number;
  scope: "SERVER" | "PROXY_NETWORK";
  available: boolean;
  recommended: boolean;
  verificationMethod: "SERVER_PLUGIN";
};

const milestoneCatalog = [
  {
    metric: "PLAYTIME_SECONDS",
    title: "Stay active",
    description: "Accumulate active playtime reported in bounded plugin intervals.",
    suggestedTarget: 1_800,
    maximumTarget: 86_400,
    core: true,
  },
  {
    metric: "UNIQUE_PLAYER_KILLS",
    title: "Defeat unique players",
    description: "Count each verified opponent once to reduce repeat-player farming.",
    suggestedTarget: 10,
    maximumTarget: 250,
    core: true,
  },
  {
    metric: "PLAYER_KILLS",
    title: "Defeat players",
    description: "Count validated player-versus-player eliminations.",
    suggestedTarget: 25,
    maximumTarget: 1_000,
    core: true,
  },
  {
    metric: "PVP_STREAK",
    title: "Reach a PvP streak",
    description: "Reach a validated elimination streak without dying.",
    suggestedTarget: 5,
    maximumTarget: 100,
    core: true,
  },
  {
    metric: "MOB_KILLS",
    title: "Defeat mobs",
    description: "Count validated mob eliminations on the selected server scope.",
    suggestedTarget: 50,
    maximumTarget: 5_000,
    core: true,
  },
  {
    metric: "BLOCKS_BROKEN",
    title: "Break blocks",
    description: "Count legitimate block breaks reported by the server plugin.",
    suggestedTarget: 500,
    maximumTarget: 100_000,
    core: true,
  },
  {
    metric: "SKYBLOCK_LEVEL",
    title: "Reach an island level",
    description: "Read island level from a detected and advertised Skyblock provider.",
    suggestedTarget: 100,
    maximumTarget: 1_000_000,
    core: false,
  },
  {
    metric: "ISLAND_WORTH",
    title: "Reach an island worth",
    description: "Read island worth from a detected and advertised Skyblock provider.",
    suggestedTarget: 100_000,
    maximumTarget: 1_000_000_000_000,
    core: false,
  },
  {
    metric: "LIFESTEAL_HEARTS",
    title: "Reach a heart total",
    description: "Read the heart total from a detected and advertised Lifesteal provider.",
    suggestedTarget: 20,
    maximumTarget: 1_000,
    core: false,
  },
  {
    metric: "SKILL_LEVEL",
    title: "Reach a skill level",
    description: "Read a supported skill or power level from an advertised provider.",
    suggestedTarget: 100,
    maximumTarget: 100_000,
    core: false,
  },
] as const;

const roundDown = (value: number, step: number) => Math.floor(value / step) * step;
const roundUp = (value: number, step: number) => Math.ceil(value / step) * step;

export type CampaignCreditLedgerLike = {
  direction: "CREDIT" | "DEBIT";
  amountCents: number;
  purchasedCents: number;
  promotionalCents: number;
  expiresAt?: Date | null;
};

export const CAMPAIGN_MINIMUM_AVERAGE_PLAYERS = 10;
export const CAMPAIGN_ACTIVITY_WINDOW_DAYS = 7;
export const CAMPAIGN_MINIMUM_ACTIVITY_SAMPLES = 10;
export const CAMPAIGN_ACTIVITY_FRESHNESS_MINUTES = 10;
export const CAMPAIGN_MINIMUM_ACTIVITY_SPAN_MINUTES = 8;

export const evaluateCampaignEligibility = (
  samples: readonly { onlinePlayers: number; observedAt: Date }[],
  now = new Date(),
) => {
  const latest = samples.reduce<Date | null>(
    (value, sample) => (!value || sample.observedAt > value ? sample.observedAt : value),
    null,
  );
  const earliest = samples.reduce<Date | null>(
    (value, sample) => (!value || sample.observedAt < value ? sample.observedAt : value),
    null,
  );
  const averagePlayers = samples.length
    ? samples.reduce((total, sample) => total + sample.onlinePlayers, 0) / samples.length
    : 0;
  const base = {
    minimumAveragePlayers: CAMPAIGN_MINIMUM_AVERAGE_PLAYERS,
    averagePlayers: Math.round(averagePlayers * 10) / 10,
    sampleCount: samples.length,
    windowDays: CAMPAIGN_ACTIVITY_WINDOW_DAYS,
    latestSampleAt: latest?.toISOString() ?? null,
  };
  if (
    samples.length < CAMPAIGN_MINIMUM_ACTIVITY_SAMPLES ||
    !earliest ||
    !latest ||
    latest.getTime() - earliest.getTime() < CAMPAIGN_MINIMUM_ACTIVITY_SPAN_MINUTES * 60_000
  ) {
    return { ...base, eligible: false, reason: "INSUFFICIENT_ACTIVITY_HISTORY" as const };
  }
  if (
    !latest ||
    now.getTime() - latest.getTime() > CAMPAIGN_ACTIVITY_FRESHNESS_MINUTES * 60_000
  ) {
    return { ...base, eligible: false, reason: "STALE_ACTIVITY" as const };
  }
  if (averagePlayers < CAMPAIGN_MINIMUM_AVERAGE_PLAYERS) {
    return { ...base, eligible: false, reason: "BELOW_MINIMUM_AVERAGE" as const };
  }
  return { ...base, eligible: true, reason: "ELIGIBLE" as const };
};

export const calculateCampaignCreditBalance = (
  entries: readonly CampaignCreditLedgerLike[],
  now = new Date(),
) => {
  let total = 0;
  let purchased = 0;
  let promotional = 0;
  for (const entry of entries) {
    if (
      entry.direction === "CREDIT" &&
      entry.expiresAt &&
      entry.expiresAt.getTime() <= now.getTime()
    ) {
      continue;
    }
    const direction = entry.direction === "CREDIT" ? 1 : -1;
    total += direction * entry.amountCents;
    purchased += direction * entry.purchasedCents;
    promotional += direction * entry.promotionalCents;
  }
  total = Math.max(0, total);
  promotional = Math.max(0, Math.min(total, promotional));
  purchased = Math.max(0, total - promotional);
  return { total, purchased, promotional };
};

export const allocateCampaignCreditBudget = (
  balance: { total: number; purchased: number; promotional: number },
  budgetCredits: number,
) => {
  if (!Number.isInteger(budgetCredits) || budgetCredits < 1 || budgetCredits > balance.total) {
    throw new Error("Campaign budget exceeds available Campaign Credits.");
  }
  const promotional = Math.min(balance.promotional, budgetCredits);
  return {
    promotional,
    purchased: budgetCredits - promotional,
  };
};

export const deriveCampaignCapacity = (input: {
  budgetCredits: number;
  maximumSparksReward: number;
  milestoneCount: number;
}) => {
  const costPerPotentialParticipant = Math.max(
    10,
    10 + Math.ceil(input.maximumSparksReward / 10) + Math.max(1, input.milestoneCount) * 3,
  );
  return {
    capacity: Math.max(
      10,
      Math.min(25_000, Math.floor(input.budgetCredits / costPerPotentialParticipant)),
    ),
    costPerPotentialParticipant,
  };
};

export const estimatePotentialExposure = (capacity: number, currentPlayers?: number | null) => {
  const boundedCapacity = Math.max(10, Math.min(25_000, Math.floor(capacity)));
  const concurrentPlayers = Math.max(5, Math.floor(currentPlayers ?? 25));
  const minimum = Math.min(
    boundedCapacity,
    Math.max(10, roundDown(Math.min(boundedCapacity * 0.3, concurrentPlayers * 2), 10)),
  );
  const maximum = Math.min(
    boundedCapacity,
    Math.max(minimum, roundUp(Math.max(boundedCapacity * 0.72, concurrentPlayers * 6), 25)),
  );
  return {
    minimum,
    maximum,
    methodology:
      "A deliberately broad directional range based on capacity and recent server concurrency; it is not a delivery promise.",
  };
};

export const suggestCampaignMilestones = (
  advertisedMetrics: readonly string[],
  proxyNetwork: boolean,
): CampaignMilestoneSuggestion[] => {
  const advertised = new Set(advertisedMetrics.map((metric) => metric.toUpperCase()));
  return milestoneCatalog.map((item, index) => {
    const available = item.core || advertised.has(item.metric);
    return {
      metric: item.metric,
      title: item.title,
      description: item.description,
      suggestedTarget: item.suggestedTarget,
      maximumTarget: item.maximumTarget,
      scope: proxyNetwork ? "PROXY_NETWORK" : "SERVER",
      available,
      recommended: available && index < 3,
      verificationMethod: "SERVER_PLUGIN",
    };
  });
};

export const validateMilestoneTarget = (metric: string, target: number) => {
  const definition = milestoneCatalog.find((item) => item.metric === metric.toUpperCase());
  return Boolean(
    definition && Number.isInteger(target) && target >= 1 && target <= definition.maximumTarget,
  );
};

export const canAutomaticallyApprovePluginMilestone = (input: {
  verificationMethod: string;
  reviewRequired: boolean;
  metric: string;
  target: number;
  observed: number;
  eventCount: number;
  firstObservedAt?: Date;
  lastObservedAt?: Date;
}) => {
  if (input.verificationMethod !== "SERVER_PLUGIN" || input.reviewRequired) return false;
  if (!validateMilestoneTarget(input.metric, input.target)) return false;
  if (!Number.isFinite(input.observed) || input.observed < input.target) return false;
  if (!Number.isInteger(input.eventCount) || input.eventCount < 1 || input.eventCount > 10_000) {
    return false;
  }

  const rateCheckedMetrics = new Set([
    "PLAYER_KILLS",
    "UNIQUE_PLAYER_KILLS",
    "MOB_KILLS",
    "BLOCKS_BROKEN",
    "PVP_STREAK",
  ]);
  if (rateCheckedMetrics.has(input.metric)) {
    if (!input.firstObservedAt || !input.lastObservedAt) return false;
    const observedSpan = input.lastObservedAt.getTime() - input.firstObservedAt.getTime();
    const minimumSpan = Math.min(30_000, Math.max(0, (Math.min(input.target, 121) - 1) * 250));
    if (observedSpan < minimumSpan) return false;
  }
  return true;
};
