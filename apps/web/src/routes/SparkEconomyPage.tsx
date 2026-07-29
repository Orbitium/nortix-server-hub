import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Download,
  Flame,
  Gift,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Button, Card } from "@nortix/ui";
import { Modal } from "../components/Modal";
import {
  type AdminSparkBreakdown,
  type AdminSparksDashboard,
  useAdminSparks,
} from "../features/api-data";

type RangePreset = "today" | "yesterday" | "7d" | "30d" | "custom";
type Drilldown = {
  title: string;
  direction?: "CREDIT" | "DEBIT";
  transactionTypes?: string[];
  date?: string;
} | null;

const formatSparks = (value: number) => `${Math.round(value).toLocaleString()} Sparks`;
const formatPercent = (value: number) =>
  `${value >= 0 ? "" : "−"}${Math.abs(value).toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;
const formatMoney = (cents: number | null) =>
  cents === null
    ? "Not configured"
    : new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(cents / 100);
const toDateInput = (date: Date) => date.toISOString().slice(0, 10);

function presetDates(preset: Exclude<RangePreset, "custom">) {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const from = new Date(today);
  const to = new Date(today);
  if (preset === "yesterday") {
    from.setUTCDate(from.getUTCDate() - 1);
    to.setUTCDate(to.getUTCDate() - 1);
  } else if (preset === "7d") {
    from.setUTCDate(from.getUTCDate() - 6);
  } else if (preset === "30d") {
    from.setUTCDate(from.getUTCDate() - 29);
  }
  return { from: toDateInput(from), to: toDateInput(to) };
}

const rangeLabels: Record<RangePreset, string> = {
  today: "Today",
  yesterday: "Yesterday",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  custom: "Custom range",
};

const breakdownTransactionTypes: Record<string, string[]> = {
  PLAYTESTS: ["CAMPAIGN_REWARD"],
  DAILY_QUESTS: ["DAILY_QUEST"],
  REFERRALS: ["REFERRAL"],
  PROMOTIONS: ["SEASONAL_EVENT"],
  MANUAL_GRANTS: ["MANUAL_ADJUSTMENT"],
  HYPE: ["HYPE_PURCHASE"],
  SERVER_AWARDS: ["SERVER_AWARD_PURCHASE"],
  COSMETICS: ["COSMETIC_PURCHASE"],
  PROFILE_ITEMS: ["COSMETIC_PURCHASE"],
  SEASONAL_ITEMS: ["COSMETIC_PURCHASE"],
  GIFT_REWARDS: ["SPONSORED_PURCHASE", "SERVER_STORE_PURCHASE"],
};

function downloadCsv(data: AdminSparksDashboard) {
  const rows: Array<Array<string | number>> = [
    ["section", "date_or_category", "issued", "burned", "redeemed", "transactions", "percentage"],
    ...data.trend.map((day) => [
      "daily",
      day.date,
      day.issued,
      day.burned,
      day.redeemed,
      day.entries,
      day.burnToIssueRatio,
    ]),
    ...data.sources.map((source) => [
      "source",
      source.label,
      source.total,
      "",
      "",
      source.transactions,
      source.percentage,
    ]),
    ...data.sinks.map((sink) => [
      "sink",
      sink.label,
      "",
      sink.total,
      "",
      sink.transactions,
      sink.percentage,
    ]),
  ];
  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `nortix-spark-economy-${data.range.from.slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function BreakdownList({
  title,
  description,
  entries,
  onSelect,
}: {
  title: string;
  description: string;
  entries: AdminSparkBreakdown[];
  onSelect: (entry: AdminSparkBreakdown) => void;
}) {
  return (
    <Card className="economy-section-card">
      <div className="economy-section-heading">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <strong>{formatSparks(entries.reduce((sum, entry) => sum + entry.total, 0))}</strong>
      </div>
      <div className="economy-breakdown">
        {entries.map((entry) => (
          <button key={entry.key} type="button" onClick={() => onSelect(entry)}>
            <span className="economy-breakdown__label">
              <strong>{entry.label}</strong>
              <small>{entry.transactions.toLocaleString()} ledger entries</small>
            </span>
            <span className="economy-breakdown__bar" aria-hidden="true">
              <i style={{ width: `${Math.max(0, Math.min(100, entry.percentage))}%` }} />
            </span>
            <span className="economy-breakdown__value">
              <strong>{entry.total.toLocaleString()}</strong>
              <small className={entry.changePercent > 0 ? "trend-up" : entry.changePercent < 0 ? "trend-down" : ""}>
                {formatPercent(entry.changePercent)} vs prior
              </small>
            </span>
          </button>
        ))}
      </div>
    </Card>
  );
}

function EconomyChart({
  data,
  onSelectDay,
}: {
  data: AdminSparksDashboard["trend"];
  onSelectDay: (date: string) => void;
}) {
  const max = Math.max(1, ...data.flatMap((day) => [day.issued, day.burned, day.redeemed]));
  return (
    <Card className="economy-section-card economy-chart-card">
      <div className="economy-section-heading">
        <div>
          <h2>Economy flow</h2>
          <p>Issued, burned, and real-cost reward redemptions by UTC day. Select a day to inspect its ledger activity.</p>
        </div>
      </div>
      <div className="economy-chart" aria-label="Sparks economy flow chart">
        {data.map((day) => (
          <button
            key={day.date}
            type="button"
            title={`${day.date}: ${day.issued} issued, ${day.burned} burned, ${day.redeemed} redeemed`}
            onClick={() => onSelectDay(day.date)}
          >
            <span className="economy-chart__bars">
              <i className="economy-chart__issued" style={{ height: `${Math.max(2, (day.issued / max) * 100)}%` }} />
              <i className="economy-chart__burned" style={{ height: `${Math.max(2, (day.burned / max) * 100)}%` }} />
              <i className="economy-chart__redeemed" style={{ height: `${Math.max(2, (day.redeemed / max) * 100)}%` }} />
            </span>
            <small>{data.length <= 10 ? day.date.slice(5) : day.date.slice(8)}</small>
          </button>
        ))}
      </div>
      <div className="economy-chart-legend">
        <span><i className="economy-chart__issued" /> Issued</span>
        <span><i className="economy-chart__burned" /> Burned</span>
        <span><i className="economy-chart__redeemed" /> Redeemed</span>
      </div>
    </Card>
  );
}

function MiniTrendChart({
  title,
  note,
  data,
  value,
  format = (entry) => Math.round(entry).toLocaleString(),
}: {
  title: string;
  note: string;
  data: AdminSparksDashboard["trend"];
  value: (day: AdminSparksDashboard["trend"][number]) => number | null;
  format?: (value: number) => string;
}) {
  const values = data.map(value);
  const numeric = values.filter((entry): entry is number => entry !== null);
  const max = Math.max(1, ...numeric);
  return (
    <Card className="economy-mini-chart">
      <div><strong>{title}</strong><small>{note}</small></div>
      {numeric.length ? (
        <div className="economy-mini-chart__plot">
          {values.map((entry, index) => (
            <i
              key={data[index]?.date}
              style={{ height: `${entry === null ? 0 : Math.max(3, (entry / max) * 100)}%` }}
              title={entry === null ? "Not configured" : `${data[index]?.date}: ${format(entry)}`}
            />
          ))}
        </div>
      ) : <span className="economy-mini-chart__empty">Not configured</span>}
    </Card>
  );
}

export function SparkEconomyPage() {
  const initial = presetDates("30d");
  const [preset, setPreset] = useState<RangePreset>("30d");
  const [draftFrom, setDraftFrom] = useState(initial.from);
  const [draftTo, setDraftTo] = useState(initial.to);
  const [applied, setApplied] = useState({ ...initial, label: rangeLabels["30d"], live: true });
  const [drilldown, setDrilldown] = useState<Drilldown>(null);
  const { data, isLoading, isError, refetch, isFetching } = useAdminSparks(applied);

  const drilldownRows = useMemo(() => {
    if (!data || !drilldown) return [];
    return data.recentActivity.filter((entry) => {
      if (drilldown.direction && entry.direction !== drilldown.direction) return false;
      if (drilldown.transactionTypes?.length && !drilldown.transactionTypes.includes(entry.transactionType)) return false;
      return !drilldown.date || entry.createdAt.slice(0, 10) === drilldown.date;
    });
  }, [data, drilldown]);

  const selectPreset = (next: RangePreset) => {
    setPreset(next);
    if (next === "custom") return;
    const dates = presetDates(next);
    setDraftFrom(dates.from);
    setDraftTo(dates.to);
    setApplied({ ...dates, label: rangeLabels[next], live: true });
  };

  return (
    <>
      <div className="dashboard-heading admin-v2-heading economy-page-heading">
        <div>
          <span className="eyebrow">INTERNAL CONTROL CENTER</span>
          <h1>Spark Economy</h1>
          <p>Monitor issuance, sinks, reward exposure, distribution, and abuse signals from server-side ledger data.</p>
        </div>
        <div className="economy-heading-actions">
          <Button variant="secondary" disabled={!data} onClick={() => data && downloadCsv(data)}>
            <Download /> Export CSV
          </Button>
          <Button disabled={isFetching} onClick={() => void refetch()}>
            <RefreshCw /> {isFetching ? "Refreshing…" : "Refresh"}
          </Button>
        </div>
      </div>

      <Card className="economy-filter-card">
        <div className="economy-presets" aria-label="Economy time range">
          {(Object.keys(rangeLabels) as RangePreset[]).map((value) => (
            <button
              key={value}
              type="button"
              className={preset === value ? "is-active" : ""}
              onClick={() => selectPreset(value)}
            >
              {rangeLabels[value]}
            </button>
          ))}
        </div>
        {preset === "custom" ? (
          <form
            className="economy-custom-range"
            onSubmit={(event) => {
              event.preventDefault();
              setApplied({ from: draftFrom, to: draftTo, label: "Custom range", live: true });
            }}
          >
            <label>From <input type="date" value={draftFrom} onChange={(event) => setDraftFrom(event.target.value)} required /></label>
            <label>To <input type="date" value={draftTo} onChange={(event) => setDraftTo(event.target.value)} required /></label>
            <Button type="submit" disabled={draftFrom > draftTo}>Apply range</Button>
          </form>
        ) : null}
        {data ? <small>UTC range · generated {new Date(data.generatedAt).toLocaleString()} · refreshes every 60 seconds</small> : null}
      </Card>

      {isLoading ? <Card className="economy-loading">Loading Spark economy data…</Card> : null}
      {isError ? (
        <Card className="economy-error">
          <ShieldAlert />
          <div><h2>Economy data could not be loaded</h2><p>Check the API connection and your Sparks administration permission.</p></div>
          <Button onClick={() => void refetch()}>Retry</Button>
        </Card>
      ) : null}

      {data ? (
        <div className="economy-dashboard">
          <section className="economy-alerts" aria-label="Economy alerts">
            {data.alerts.length ? data.alerts.map((alert) => (
              <button
                type="button"
                key={alert.code}
                className={`economy-alert economy-alert--${alert.severity.toLowerCase()}`}
                onClick={() => setDrilldown({ title: alert.title })}
              >
                <AlertTriangle />
                <span><strong>{alert.title}</strong><small>{alert.detail}</small></span>
              </button>
            )) : (
              <div className="economy-alert economy-alert--info">
                <Sparkles /><span><strong>No threshold warnings</strong><small>No configured economy threshold was exceeded for this range.</small></span>
              </div>
            )}
          </section>

          <section className="economy-overview-grid" aria-label="Spark economy overview">
            {[
              { label: "Total issued", value: data.overview.totalIssued, note: "All-time ledger credits", Icon: ArrowUpRight },
              { label: "Total burned", value: data.overview.totalBurned, note: "Permanent Spark sinks", Icon: Flame },
              { label: "Real-cost redemptions", value: data.overview.totalRedeemed, note: "Gift and store reward debits", Icon: Gift },
              { label: "Currently held", value: data.overview.totalHeld, note: "Positive user balances", Icon: Users },
              { label: "Net inflation", value: data.overview.netInflation, note: "Issued − burned − redeemed", Icon: BarChart3 },
              { label: "Average / active user", value: data.overview.averagePerActiveUser, note: "Using 30-day active users", Icon: Sparkles },
            ].map(({ label, value, note, Icon }) => (
              <Card key={label} className="economy-kpi">
                <Icon />
                <small>{label}</small>
                <strong>{Number(value).toLocaleString()}</strong>
                <span>{note}</span>
              </Card>
            ))}
            <Card className="economy-kpi economy-kpi--active">
              <Users /><small>Active users</small>
              <strong>{data.overview.activeUsers.hours24.toLocaleString()} <i>24h</i></strong>
              <span>{data.overview.activeUsers.days7.toLocaleString()} in 7d · {data.overview.activeUsers.days30.toLocaleString()} in 30d</span>
            </Card>
          </section>

          <EconomyChart data={data.trend} onSelectDay={(date) => setDrilldown({ title: `Ledger activity on ${date}`, date })} />

          <section className="economy-mini-chart-grid" aria-label="Spark economy trend charts">
            <MiniTrendChart
              title="Outstanding Spark liability"
              note="Modeled from the running held balance"
              data={data.trend}
              value={(day) => day.outstandingLiabilityCents}
              format={(value) => formatMoney(value)}
            />
            <MiniTrendChart
              title="Issued vs burned ratio"
              note="Daily burn-to-issue ratio"
              data={data.trend}
              value={(day) => day.burnToIssueRatio * 100}
              format={formatPercent}
            />
            <MiniTrendChart
              title="Ad revenue vs liability"
              note="Revenue remains blank until provider reporting is connected"
              data={data.trend}
              value={(day) => day.estimatedAdRevenueCents}
              format={(value) => formatMoney(value)}
            />
            <MiniTrendChart
              title="Hype generated"
              note="Community Hype added by UTC day"
              data={data.trend}
              value={(day) => day.hypeGenerated}
            />
            <MiniTrendChart
              title="Awards purchased"
              note="Permanent server Awards by UTC day"
              data={data.trend}
              value={(day) => day.awardsPurchased}
            />
          </section>

          <section className="economy-health-grid" aria-label="Economy health">
            {[
              ["Issued today", formatSparks(data.health.issuedToday)],
              ["Burned today", formatSparks(data.health.burnedToday)],
              ["Redeemed today", formatSparks(data.health.redeemedToday)],
              ["Burn rate", formatPercent(data.health.burnRate)],
              ["Redemption rate", formatPercent(data.health.redemptionRate)],
              ["Inflation rate", formatPercent(data.health.inflationRate)],
              ["Burn-to-issue", formatPercent(data.health.burnToIssueRatio * 100)],
              ["Average balance", formatSparks(data.health.averageBalance)],
              ["Median balance", formatSparks(data.health.medianBalance)],
              ["Average daily earnings", formatSparks(data.health.averageDailyEarnings)],
              ["Average daily spending", formatSparks(data.health.averageDailySpending)],
              ["Modeled outstanding liability", formatMoney(data.health.outstandingLiabilityCents)],
            ].map(([label, value]) => (
              <Card key={label}><small>{label}</small><strong>{value}</strong></Card>
            ))}
          </section>

          <div className="economy-two-column">
            <BreakdownList
              title="Spark sources"
              description="Where new Sparks entered player balances in this range."
              entries={data.sources}
              onSelect={(entry) => setDrilldown({
                title: entry.label,
                direction: "CREDIT",
                transactionTypes: breakdownTransactionTypes[entry.key],
              })}
            />
            <BreakdownList
              title="Spark sinks"
              description="Where Sparks were spent; real-cost reward debits are also analyzed below."
              entries={data.sinks}
              onSelect={(entry) => setDrilldown({
                title: entry.label,
                direction: "DEBIT",
                transactionTypes: breakdownTransactionTypes[entry.key],
              })}
            />
          </div>

          <div className="economy-two-column">
            <Card className="economy-section-card">
              <div className="economy-section-heading">
                <div><h2>Real-cost rewards</h2><p>Sponsored gifts and server-store reward claims.</p></div>
                <Gift />
              </div>
              <div className="economy-stat-grid">
                <span><small>Rewards redeemed</small><strong>{data.redemption.rewardsRedeemed.toLocaleString()}</strong></span>
                <span><small>Sparks redeemed</small><strong>{data.redemption.sparksRedeemed.toLocaleString()}</strong></span>
                <span><small>Pending claims</small><strong>{data.redemption.pendingClaims.toLocaleString()}</strong></span>
                <span><small>Redemption rate</small><strong>{formatPercent(data.redemption.redemptionRate)}</strong></span>
                <span><small>Estimated fulfillment</small><strong>{formatMoney(data.redemption.estimatedFulfillmentCostCents)}</strong></span>
                <span><small>Outstanding liability</small><strong>{formatMoney(data.redemption.estimatedOutstandingLiabilityCents)}</strong></span>
              </div>
              <p className="economy-assumption">{data.redemption.costModel}</p>
              <div className="economy-ranked-list">
                {data.redemption.mostRedeemed.map((reward) => (
                  <div key={`${reward.provider}-${reward.name}`}>
                    <span><strong>{reward.name}</strong><small>{reward.provider} · {reward.redemptions} redemptions</small></span>
                    <b>{reward.sparks.toLocaleString()} Sparks</b>
                  </div>
                ))}
                {!data.redemption.mostRedeemed.length ? <p>No rewards were redeemed in this range.</p> : null}
              </div>
            </Card>

            <Card className="economy-section-card">
              <div className="economy-section-heading">
                <div><h2>Rewarded ads</h2><p>Only completed server-side rewarded sessions are counted.</p></div>
                <BarChart3 />
              </div>
              <div className="economy-stat-grid">
                <span><small>Ads watched</small><strong>{data.rewardedAds.adsWatched.toLocaleString()}</strong></span>
                <span><small>Estimated revenue</small><strong>{formatMoney(data.rewardedAds.estimatedAdRevenueCents)}</strong></span>
                <span><small>Sparks granted</small><strong>{data.rewardedAds.sparksGranted.toLocaleString()}</strong></span>
                <span><small>Spark liability</small><strong>{formatMoney(data.rewardedAds.estimatedSparkLiabilityCents)}</strong></span>
                <span><small>Average revenue / ad</small><strong>{formatMoney(data.rewardedAds.averageRevenuePerAdCents)}</strong></span>
                <span><small>Average Spark reward</small><strong>{data.rewardedAds.averageSparkReward.toLocaleString()}</strong></span>
              </div>
              <p className="economy-assumption">{data.rewardedAds.note}</p>
            </Card>
          </div>

          <Card className="economy-section-card">
            <div className="economy-section-heading"><div><h2>User balance distribution</h2><p>Accounts grouped by current positive ledger balance.</p></div></div>
            <div className="economy-distribution">
              {data.distribution.map((bucket) => (
                <div key={bucket.label}>
                  <span><strong>{bucket.label}</strong><small>{bucket.users.toLocaleString()} users · {formatPercent(bucket.percentage)}</small></span>
                  <i><b style={{ width: `${Math.max(1, bucket.percentage)}%` }} /></i>
                  <b>{bucket.totalHeld.toLocaleString()} Sparks held</b>
                </div>
              ))}
            </div>
          </Card>

          <Card className="economy-section-card data-card">
            <div className="economy-section-heading"><div><h2>Top users</h2><p>Highest balances with lifetime flow and deterministic risk signals.</p></div></div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>User</th><th>Balance</th><th>Earned</th><th>Spent</th><th>Burn ratio</th><th>Redemptions</th><th>Signals</th></tr></thead>
                <tbody>
                  {data.topUsers.map((user) => (
                    <tr key={user.id}>
                      <td><strong>{user.displayName}</strong><small className="admin-table-subtext">@{user.username}</small></td>
                      <td>{user.balance.toLocaleString()}</td>
                      <td>{user.lifetimeEarned.toLocaleString()}</td>
                      <td>{user.lifetimeSpent.toLocaleString()}</td>
                      <td>{formatPercent(user.burnRatio)}</td>
                      <td>{user.redemptionHistory.sparks.toLocaleString()} <small className="admin-table-subtext">{user.redemptionHistory.transactions} claims</small></td>
                      <td>{user.flags.length ? <span className="economy-flag">{user.flags.join(" · ")}</span> : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="economy-section-card data-card">
            <div className="economy-section-heading"><div><h2>Server economy</h2><p>Community support metrics; Awards do not influence discovery placement.</p></div></div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Server</th><th>Current Hype</th><th>Hype today</th><th>Decay</th><th>Awards</th><th>Spark contributions</th><th>Trend</th></tr></thead>
                <tbody>
                  {data.serverEconomy.map((server) => (
                    <tr key={server.id}>
                      <td><strong>{server.name}</strong><small className="admin-table-subtext">/{server.slug}</small></td>
                      <td>{server.totalHype.toLocaleString()}</td>
                      <td>{server.hypeGeneratedToday.toLocaleString()}</td>
                      <td>{server.hypeDecayed.toLocaleString()}</td>
                      <td>{server.awardsAllTime.toLocaleString()}</td>
                      <td>{server.sparkContributions.toLocaleString()}</td>
                      <td className={server.trendPercent > 0 ? "trend-up" : server.trendPercent < 0 ? "trend-down" : ""}>{formatPercent(server.trendPercent)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="economy-assumptions">
            <ShieldAlert />
            <div>
              <strong>Planning estimates, not an accounting statement</strong>
              <p>Outstanding Spark exposure uses {formatMoney(data.assumptions.sparkLiabilityCentsPerThousand)} per 1,000 Sparks. Ad revenue is {data.assumptions.adRevenueTracking ? "connected" : "not connected"}; missing categories remain visible with zero values instead of being estimated.</p>
            </div>
          </Card>
        </div>
      ) : null}

      {drilldown ? (
        <Modal title={drilldown.title} onClose={() => setDrilldown(null)} className="economy-drilldown">
          <div className="modal__body">
            <p>Showing matching entries from the latest {data?.recentActivity.length.toLocaleString() ?? 0} ledger records loaded for this dashboard.</p>
            <div className="table-wrap">
              <table>
                <thead><tr><th>User</th><th>Change</th><th>Type</th><th>Recorded</th></tr></thead>
                <tbody>
                  {drilldownRows.map((entry) => (
                    <tr key={entry.id}>
                      <td><strong>@{entry.user.username}</strong></td>
                      <td className={entry.direction === "CREDIT" ? "sparks-credit" : "sparks-debit"}>{entry.direction === "CREDIT" ? "+" : "−"}{entry.amount.toLocaleString()}</td>
                      <td>{entry.transactionType.replaceAll("_", " ")}</td>
                      <td>{new Date(entry.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!drilldownRows.length ? <p className="economy-empty">No matching entry is present in the recent ledger window.</p> : null}
          </div>
        </Modal>
      ) : null}
    </>
  );
}
