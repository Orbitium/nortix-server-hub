export const HYPE_BUNDLE_SPARKS = 500;
export const HYPE_BUNDLE_AMOUNT = 5;
export const HYPE_DAILY_PURCHASE_LIMIT = 4;
export const HYPE_MONTHLY_CARRY_PERCENT = 20;

export const HYPE_MILESTONES = [
  { name: "Bronze", minimum: 25 },
  { name: "Silver", minimum: 100 },
  { name: "Gold", minimum: 500 },
  { name: "Platinum", minimum: 2_500 },
  { name: "Diamond", minimum: 10_000 },
] as const;

export const utcDayStart = (date = new Date()) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

export const utcMonthStart = (date = new Date()) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));

const elapsedUtcMonths = (from: Date, to: Date) =>
  Math.max(
    0,
    (to.getUTCFullYear() - from.getUTCFullYear()) * 12 +
      to.getUTCMonth() -
      from.getUTCMonth(),
  );

export const effectiveHypeScore = (
  score: number,
  storedPeriodStart: Date,
  now = new Date(),
) => {
  let current = Math.max(0, Math.floor(score));
  const elapsed = elapsedUtcMonths(utcMonthStart(storedPeriodStart), utcMonthStart(now));
  for (let month = 0; month < elapsed; month += 1) {
    current = Math.floor((current * HYPE_MONTHLY_CARRY_PERCENT) / 100);
  }
  return current;
};

export const hypeMilestoneFor = (score: number) =>
  [...HYPE_MILESTONES].reverse().find((milestone) => score >= milestone.minimum) ?? null;

export const nextHypeMilestoneFor = (score: number) =>
  HYPE_MILESTONES.find((milestone) => score < milestone.minimum) ?? null;

export type DiscoverySignals = {
  hype: number;
  online: boolean;
  playerCount: number;
  rating: number | null;
  reviewCount: number;
  monthlyVotes: number;
  activeCampaigns: number;
  completionRate: number | null;
  retentionRate: number | null;
  recentlyActive: boolean;
};

const bounded = (value: number) => Math.max(0, Math.min(1, value));
const logSignal = (value: number, reference: number) =>
  bounded(Math.log1p(Math.max(0, value)) / Math.log1p(reference));

export const discoveryScore = (signals: DiscoverySignals) => {
  const reviewConfidence = bounded(signals.reviewCount / 20);
  const reviewQuality =
    signals.rating == null ? 0 : bounded(signals.rating / 5) * (0.35 + reviewConfidence * 0.65);
  return (
    logSignal(signals.hype, 10_000) * 18 +
    (signals.retentionRate == null ? 0 : bounded(signals.retentionRate)) * 18 +
    (signals.completionRate == null ? 0 : bounded(signals.completionRate)) * 14 +
    Number(signals.recentlyActive) * 12 +
    reviewQuality * 14 +
    bounded(signals.activeCampaigns / 3) * 8 +
    Number(signals.online) * 4 +
    logSignal(signals.playerCount, 1_000) * 6 +
    logSignal(signals.monthlyVotes, 500) * 6
  );
};
