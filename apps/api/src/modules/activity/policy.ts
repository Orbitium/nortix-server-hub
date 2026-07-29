export const ACTIVITY_DAY_MS = 86_400_000;

export type DailyActivity = {
  activityDate: Date;
  webOpened: boolean;
  campaignPlayed: boolean;
  verifiedServerJoined: boolean;
};

export const utcActivityDay = (date = new Date()) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

export const isActiveDay = (activity: DailyActivity) =>
  activity.webOpened || activity.campaignPlayed || activity.verifiedServerJoined;

export function calculateActivityStreak(rows: readonly DailyActivity[], now = new Date()) {
  const today = utcActivityDay(now);
  const rowByDay = new Map(
    rows
      .filter((row) => row.activityDate.getTime() <= today.getTime())
      .map((row) => [utcActivityDay(row.activityDate).getTime(), row]),
  );
  const activeDays = [...rowByDay.entries()]
    .filter(([, row]) => isActiveDay(row))
    .map(([timestamp]) => timestamp)
    .sort((left, right) => left - right);
  const activeDaySet = new Set(activeDays);

  let longest = 0;
  let run = 0;
  let previous: number | undefined;
  for (const timestamp of activeDays) {
    run = previous !== undefined && timestamp - previous === ACTIVITY_DAY_MS ? run + 1 : 1;
    longest = Math.max(longest, run);
    previous = timestamp;
  }

  const todayTimestamp = today.getTime();
  const currentAnchor = activeDaySet.has(todayTimestamp)
    ? todayTimestamp
    : todayTimestamp - ACTIVITY_DAY_MS;
  let current = 0;
  for (
    let timestamp = currentAnchor;
    activeDaySet.has(timestamp);
    timestamp -= ACTIVITY_DAY_MS
  ) {
    current++;
  }

  const todayRow = rowByDay.get(todayTimestamp);
  return {
    current,
    longest,
    timezone: "UTC" as const,
    today: {
      webOpened: todayRow?.webOpened ?? false,
      campaignPlayed: todayRow?.campaignPlayed ?? false,
      verifiedServerJoined: todayRow?.verifiedServerJoined ?? false,
      active: todayRow ? isActiveDay(todayRow) : false,
    },
    days: Array.from({ length: 7 }, (_, index) => {
      const date = new Date(todayTimestamp - (6 - index) * ACTIVITY_DAY_MS);
      const row = rowByDay.get(date.getTime());
      return {
        date: date.toISOString(),
        active: row ? isActiveDay(row) : false,
      };
    }),
  };
}
