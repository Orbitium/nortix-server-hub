import { ArrowUpRight, Bell, Check, CheckCircle2, ChevronDown, CircleDot, Clock3, Copy, CreditCard, Database, Download, Eye, Filter, Gauge, Globe2, KeyRound, Link2, LockKeyhole, MessageSquareText, MoreHorizontal, Network, Pause, Plug, Plus, Radio, RefreshCw, Save, Search, Server, Settings, ShieldCheck, Sparkles, TrendingUp, UserPlus, Users, X, Zap } from "lucide-react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { api } from "../lib/api";
import { useNotificationPreferences, useOwnerAnalytics } from "../features/api-data";

type ServerRecord = {
  id: string;
  name: string;
  address: string;
  status: "Live" | "Attention" | "Paused";
  players: number;
  version: string;
  plugin: string;
  heartbeat: string;
  events: string;
  discovery: boolean;
  accessType?: "OWNER" | "TEAM";
  teamRole?: "OWNER" | "ADMIN" | "MANAGER" | "OPERATOR" | "ANALYST";
  permissions?: string[];
};

type AccessibleServer = {
  id: string;
  name: string;
  hostname: string;
  port: number;
  online: boolean;
  playerCount: number | null;
  versions: string[];
  publicListing: boolean;
  access: { type: "OWNER" | "TEAM"; role: ServerRecord["teamRole"]; permissions: string[] };
};

type TeamInvite = {
  id: string;
  role: "ADMIN" | "MANAGER" | "OPERATOR" | "ANALYST";
  expiresAt: string;
  server: {
    id: string;
    name: string;
    hostname: string;
    owner: { username: string; displayName: string };
  };
  inviter: { username: string; displayName: string; avatarUrl?: string };
};

type TeamOverview = {
  owner: { id: string; username: string; displayName: string };
  members: Array<{
    id: string;
    role: TeamInvite["role"];
    user: { id: string; username: string; displayName: string; avatarUrl?: string };
  }>;
  invites: Array<{
    id: string;
    role: TeamInvite["role"];
    expiresAt: string;
    invitee: { id: string; username: string; displayName: string; avatarUrl?: string };
  }>;
};

type PluginCapabilityInfo = {
  id: string;
  provider: string;
  category: "CORE" | "PVP" | "LIFESTEAL" | "SKYBLOCK" | "SKILLS";
  metrics: string[];
  version?: string;
  available: boolean;
};

type CampaignSuggestion = {
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

type CampaignSuggestionResponse = {
  exposure: { minimum: number; maximum: number; methodology: string };
  derivedCapacity: number;
  estimatedCostPerPotentialParticipant: number;
  suggestions: CampaignSuggestion[];
};

type CampaignEligibility = {
  eligible: boolean;
  reason: "ELIGIBLE" | "INSUFFICIENT_ACTIVITY_HISTORY" | "STALE_ACTIVITY" | "BELOW_MINIMUM_AVERAGE";
  minimumAveragePlayers: number;
  averagePlayers: number;
  sampleCount: number;
  windowDays: number;
  latestSampleAt: string | null;
};

type CampaignCreditBalance = {
  availableCredits: number;
  purchasedCredits: number;
  promotionalCredits: number;
  promotionalTerms: string;
  entries: Array<{
    id: string;
    direction: "CREDIT" | "DEBIT";
    credits: number;
    transactionType: string;
    referenceType: string;
    expiresAt?: string | null;
    createdAt: string;
  }>;
};

type ConfiguredMilestone = {
  id: string;
  metric: string;
  target: number;
  scope: "SERVER" | "PROXY_NETWORK";
  title: string;
};

const toConfiguredMilestone = (suggestion: CampaignSuggestion): ConfiguredMilestone => ({
  id: crypto.randomUUID(),
  metric: suggestion.metric,
  target: suggestion.suggestedTarget,
  scope: suggestion.scope,
  title: suggestion.title,
});

const OwnerServersContext = createContext<{
  servers: ServerRecord[];
  refreshServers: () => Promise<void>;
}>({
  servers: [],
  refreshServers: async () => undefined,
});

const mapAccessibleServer = (server: AccessibleServer): ServerRecord => ({
  id: server.id,
  name: server.name,
  address: `${server.hostname}${server.port === 25565 ? "" : `:${server.port}`}`,
  status: server.online ? "Live" : "Attention",
  players: server.playerCount ?? 0,
  version: server.versions[0] ?? "Unknown",
  plugin: "Connected",
  heartbeat: server.online ? "Live" : "Awaiting signal",
  events: "—",
  discovery: server.publicListing,
  accessType: server.access.type,
  teamRole: server.access.role,
  permissions: server.access.permissions,
});

function StatusDot({ status }: { status: ServerRecord["status"] }) {
  return <i className={`owner-status owner-status--${status.toLowerCase()}`}>{status}</i>;
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return (
    <button type="button" className={`owner-toggle ${checked ? "is-on" : ""}`} role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}>
      <span />
    </button>
  );
}

function OwnerHeader({ eyebrow, title, description, server, setServer, action }: { eyebrow: string; title: string; description: string; server: ServerRecord; setServer: (server: ServerRecord) => void; action?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { servers } = useContext(OwnerServersContext);
  return (
    <>
      <div className="owner-page-header">
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        <div className="owner-page-header__actions">
          <div className="owner-server-picker">
            <button onClick={() => setOpen((value) => !value)}>
              <span className="owner-server-mark">{server.name.slice(0, 2).toUpperCase()}</span>
              <span>
                <small>Viewing server</small>
                <strong>{server.name}</strong>
              </span>
              <ChevronDown />
            </button>
            {open && (
              <div>
                {servers.map((item) => (
                  <button
                    className={item.id === server.id ? "active" : ""}
                    key={item.id}
                    onClick={() => {
                      setServer(item);
                      setOpen(false);
                    }}
                  >
                    <span className="owner-server-mark">{item.name.slice(0, 2).toUpperCase()}</span>
                    <span>
                      <strong>{item.name}</strong>
                      <small>{item.address}</small>
                      {item.accessType === "TEAM" && <em className="owner-team-chip">Team · {item.teamRole === "ADMIN" ? "server admin" : item.teamRole?.toLowerCase()}</em>}
                    </span>
                    <StatusDot status={item.status} />
                  </button>
                ))}
                <Link to="/owner/servers/new">
                  <Plus /> Register another server
                </Link>
              </div>
            )}
          </div>
          {action}
        </div>
      </div>
      <div className="owner-context-strip">
        <span>
          <CircleDot /> {server.players.toLocaleString()} online now
        </span>
        <span>
          <Plug /> Plugin {server.plugin}
        </span>
        <span>
          <Radio /> Last signal {server.heartbeat}
        </span>
        <span>
          <Database /> {server.events} events this month
        </span>
        <StatusDot status={server.status} />
      </div>
    </>
  );
}

export function OwnerPlatform() {
  const location = useLocation();
  const [server, setServer] = useState<ServerRecord | null>(null);
  const [servers, setServers] = useState<ServerRecord[]>([]);
  const [serversError, setServersError] = useState("");
  const [serversLoaded, setServersLoaded] = useState(false);
  const path = location.pathname;

  const refreshServers = async () => {
    setServersError("");
    try {
      const mapped = (await api<AccessibleServer[]>("/owner/servers")).map(mapAccessibleServer);
      setServers(mapped);
      setServer((current) =>
        current && mapped.some((item) => item.id === current.id) ? current : (mapped[0] ?? null),
      );
    } finally {
      setServersLoaded(true);
    }
  };

  useEffect(() => {
    refreshServers().catch((error) =>
      setServersError(error instanceof Error ? error.message : "Owner servers could not be loaded."),
    );
  }, []);

  if (serversError) {
    return (
      <div className="dashboard-page owner-platform">
        <section className="card">
          <h1>Owner data unavailable</h1>
          <p>{serversError}</p>
          <button className="button button--primary" onClick={() => refreshServers().catch(() => undefined)}>
            Retry
          </button>
        </section>
      </div>
    );
  }
  if (!server) {
    if (path.includes("servers/new")) {
      return <RegisterServer server={null} setServer={setServer} />;
    }
    return (
      <div className="dashboard-page owner-platform">
        {!serversLoaded ? (
          <section className="card owner-server-empty"><p>Loading your server portfolio…</p></section>
        ) : (
          <section className="card owner-server-empty">
            <div className="owner-server-empty__art" aria-hidden="true">
              <span><Server /></span>
              <i /><i /><i />
            </div>
            <div className="owner-server-empty__copy">
              <span className="eyebrow">YOUR FIRST SERVER</span>
              <h1>Register your server. It’s free.</h1>
              <p>Connect your Minecraft community to unlock discovery, privacy-conscious player insights, and campaign tools when your server becomes eligible.</p>
              <div>
                <span><CheckCircle2 /> No listing fee</span>
                <span><ShieldCheck /> Secure ownership check</span>
                <span><TrendingUp /> Activity-based eligibility</span>
              </div>
              <Link className="button button--primary" to="/owner/servers/new"><Plus /> Register your server</Link>
              <small>Paper 1.16+ and Velocity networks are supported. Setup usually takes a few minutes.</small>
            </div>
          </section>
        )}
      </div>
    );
  }

  const content = path.includes("campaigns/new") ? <CampaignBuilder server={server} setServer={setServer} /> : path.includes("servers/new") ? <RegisterServer server={server} setServer={setServer} /> : path.includes("analytics") ? <OwnerAnalytics server={server} setServer={setServer} /> : path.includes("integrations") ? <PluginServers server={server} setServer={setServer} /> : path.includes("balance") ? <OwnerCredits server={server} setServer={setServer} /> : path.includes("settings") ? <OwnerSettings server={server} setServer={setServer} /> : <OwnerDashboard server={server} setServer={setServer} />;
  return <OwnerServersContext.Provider value={{ servers, refreshServers }}>{content}</OwnerServersContext.Provider>;
}

function OwnerDashboard({ server, setServer }: { server: ServerRecord; setServer: (server: ServerRecord) => void }) {
  const [range, setRange] = useState("30 days");
  const [exported, setExported] = useState(false);
  const { servers } = useContext(OwnerServersContext);
  const days = Number.parseInt(range, 10) || 30;
  const { data: analytics, isLoading: analyticsLoading } = useOwnerAnalytics(server.id, days);
  const totals = analytics?.totals;
  const chartMaximum = Math.max(1, ...(analytics?.daily.map((day) => day.impressions) ?? [1]));
  return (
    <div className="dashboard-page owner-platform">
      <OwnerHeader
        eyebrow="SERVER OWNER · PORTFOLIO OVERVIEW"
        title="Your player intelligence center"
        description="See how players discover, join, experience, and return to your servers—then turn those signals into better product decisions."
        server={server}
        setServer={setServer}
        action={
          <Link className="button button--primary" to="/owner/campaigns/new">
            <Plus /> New campaign
          </Link>
        }
      />

      <div className="owner-toolbar">
        <span>
          <strong>Portfolio:</strong> {servers.length} registered servers · {servers.filter((item) => item.status === "Live").length} live · {servers.filter((item) => item.status !== "Live").length} need attention
        </span>
        <label>
          <Clock3 />
          <select value={range} onChange={(event) => setRange(event.target.value)}>
            <option>7 days</option>
            <option>30 days</option>
            <option>90 days</option>
          </select>
        </label>
        <button onClick={() => setExported(true)}>
          <Download /> {exported ? "Export prepared" : "Export report"}
        </button>
      </div>

      <div className="owner-kpi-grid">
        {[
          {
            icon: Eye,
            label: "Discovery impressions",
            value: analyticsLoading ? "Loading…" : (totals?.impressions ?? 0).toLocaleString(),
            delta: `${days}d`,
            note: "seeded event window",
            positive: false,
          },
          {
            icon: UserPlus,
            label: "Qualified server joins",
            value: analyticsLoading ? "Loading…" : (totals?.joins ?? 0).toLocaleString(),
            delta: "Observed",
            note: "campaign join events",
            positive: false,
          },
          {
            icon: Users,
            label: "Unique active players",
            value: analyticsLoading ? "Loading…" : (totals?.uniquePlayers ?? 0).toLocaleString(),
            delta: "Observed",
            note: "distinct event users",
            positive: false,
          },
          {
            icon: TrendingUp,
            label: "7-day return rate",
            value: analytics?.retention.day7 == null ? "Insufficient data" : `${analytics.retention.day7}%`,
            delta: "D7",
            note: analytics?.retention.label ?? "Loading retention signal",
            positive: false,
          },
          {
            icon: MessageSquareText,
            label: "Useful responses",
            value: "Not collected",
            delta: "—",
            note: "feedback quality signal unavailable",
            positive: false,
          },
          {
            icon: Sparkles,
            label: "Potential Sparks exposure",
            value: analyticsLoading ? "Loading…" : `${totals?.campaigns ?? 0} campaigns`,
            delta: "Configured",
            note: `${totals?.participations ?? 0} participation records`,
            positive: false,
          },
        ].map(({ icon: Icon, label, value, delta, note, positive }) => (
          <article className="card owner-kpi" key={label}>
            <header>
              <span>
                <Icon />
              </span>
              <small>{label}</small>
              <MoreHorizontal />
            </header>
            <strong>{value}</strong>
            <p className={positive ? "positive" : ""}>
              {positive ? <ArrowUpRight /> : <Gauge />}
              {delta} <span>{note}</span>
            </p>
          </article>
        ))}
      </div>

      <div className="owner-dashboard-grid">
        <section className="card owner-trend-card">
          <div className="owner-card-heading">
            <div>
              <h2>Player demand & conversion</h2>
              <p>Daily qualified discovery traffic and resulting joins for {server.name}.</p>
            </div>
            <span className="owner-legend">
              <i /> Impressions <i /> Joins
            </span>
          </div>
          <div className="owner-chart-summary">
            <span>
              <small>Total qualified visits</small>
              <strong>{(totals?.impressions ?? 0).toLocaleString()}</strong>
              <em>{days}-day window</em>
            </span>
            <span>
              <small>Resulting joins</small>
              <strong>{(totals?.joins ?? 0).toLocaleString()}</strong>
              <em>{totals?.impressions ? `${((totals.joins / totals.impressions) * 100).toFixed(1)}% observed conversion` : "No impression baseline"}</em>
            </span>
          </div>
          <div className="owner-bar-chart" aria-label="Discovery and join trend">
            {(analytics?.daily ?? []).map((day) => (
              <i style={{ height: `${Math.max(4, (day.impressions / chartMaximum) * 100)}%` }} key={day.date}>
                <b style={{ height: `${day.impressions ? Math.max(4, (day.joins / day.impressions) * 100) : 0}%` }} />
              </i>
            ))}
          </div>
          <div className="owner-chart-axis">
            <span>Jun 21</span>
            <span>Jun 28</span>
            <span>Jul 5</span>
            <span>Jul 12</span>
            <span>Today</span>
          </div>
        </section>

        <section className="card owner-funnel-card">
          <div className="owner-card-heading">
            <div>
              <h2>Acquisition funnel</h2>
              <p>Where potential players stop or continue.</p>
            </div>
            <Filter />
          </div>
          {[
            ["Discovery impressions", (totals?.impressions ?? 0).toLocaleString(), "seeded events", 100],
            ["Campaign views", (totals?.views ?? 0).toLocaleString(), "observed events", totals?.impressions ? Math.round((totals.views / totals.impressions) * 100) : 0],
            ["Campaign joins", (totals?.joins ?? 0).toLocaleString(), "observed events", totals?.impressions ? Math.round((totals.joins / totals.impressions) * 100) : 0],
            ["Server connections", (totals?.connections ?? 0).toLocaleString(), "observed events", totals?.impressions ? Math.round((totals.connections / totals.impressions) * 100) : 0],
          ].map(([label, value, rate, width]) => (
            <div className="owner-funnel-row" key={label}>
              <span>
                <strong>{label}</strong>
                <small>{rate} of impressions</small>
              </span>
              <div>
                <i style={{ width: `${width}%` }} />
              </div>
              <b>{value}</b>
            </div>
          ))}
          <Link to="/owner/analytics">
            Open conversion analysis <ArrowUpRight />
          </Link>
        </section>
      </div>

      <div className="owner-dashboard-grid owner-dashboard-grid--lower">
        <section className="card">
          <div className="owner-card-heading">
            <div>
              <h2>Campaign performance</h2>
              <p>Signals from active and recently completed research campaigns.</p>
            </div>
            <Link to="/owner/campaigns/new">Create campaign</Link>
          </div>
          <div className="owner-table-wrap">
            <table className="owner-table">
              <thead>
                <tr>
                  <th>Campaign</th>
                  <th>Status</th>
                  <th>Participants</th>
                  <th>Completion</th>
                  <th>Useful feedback</th>
                  <th>Sparks limit</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {(analytics?.campaigns ?? []).map((campaign) => (
                  <tr key={campaign.id}>
                    <td><strong>{campaign.title}</strong></td>
                    <td>{campaign.status}</td>
                    <td>{campaign._count.participations}</td>
                    <td>Not enough data</td>
                    <td>Not collected</td>
                    <td>Up to {campaign.maximumSparksReward}</td>
                    <td>
                      <button>
                        <MoreHorizontal />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="card owner-insight-card">
          <header>
            <span>
              <Zap />
            </span>
            <div>
              <h2>Nortix Insight</h2>
              <p>Insights require persisted feedback and cohort samples.</p>
            </div>
          </header>
          <strong>No statistically supported insight is available in the seeded dataset yet.</strong>
          <p>Nortix will show a conclusion here only after the backend has enough verified events and feedback to support it.</p>
          <div>
            <span>
              Confidence <b>Unavailable</b>
            </span>
            <span>
              Sample <b>{totals?.uniquePlayers ?? 0} players</b>
            </span>
          </div>
          <button>
            Open supporting data <ArrowUpRight />
          </button>
        </aside>
      </div>

      <section className="owner-portfolio-section">
        <div className="owner-card-heading">
          <div>
            <h2>Registered server portfolio</h2>
            <p>Connection health and topline demand across every server on this owner account.</p>
          </div>
          <Link to="/owner/integrations">Manage servers</Link>
        </div>
        <div className="owner-server-cards">
          {servers.map((item) => (
            <article className="card" key={item.id}>
              <header>
                <span className="owner-server-mark">{item.name.slice(0, 2).toUpperCase()}</span>
                <div>
                  <strong>{item.name}</strong>
                  <small>{item.address}</small>
                </div>
                <StatusDot status={item.status} />
              </header>
              <div>
                <span>
                  <small>Online</small>
                  <strong>{item.players.toLocaleString()}</strong>
                </span>
                <span>
                  <small>30d joins</small>
                  <strong>{item.id === server.id ? (totals?.joins ?? 0).toLocaleString() : "Open to load"}</strong>
                </span>
                <span>
                  <small>7d return</small>
                  <strong>{item.id === server.id ? (analytics?.retention.day7 == null ? "Insufficient data" : `${analytics.retention.day7}%`) : "Open to load"}</strong>
                </span>
              </div>
              <button onClick={() => setServer(item)}>
                View server data <ArrowUpRight />
              </button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function OwnerAnalytics({ server, setServer }: { server: ServerRecord; setServer: (server: ServerRecord) => void }) {
  const [tab, setTab] = useState("Overview");
  const [range, setRange] = useState("Last 30 days");
  const days = Number.parseInt(range.replace(/\D/g, ""), 10) || 30;
  const { data: analytics } = useOwnerAnalytics(server.id, Math.min(90, Math.max(7, days)));
  const analyticsMaximum = Math.max(1, ...(analytics?.daily.map((day) => day.impressions) ?? [1]));
  const trendBars = (analytics?.daily ?? []).map((day) => Math.max(4, (day.impressions / analyticsMaximum) * 100));
  const retentionBars = [analytics?.retention.day1, analytics?.retention.day7].filter((value): value is number => value != null);
  return (
    <div className="dashboard-page owner-platform">
      <OwnerHeader
        eyebrow="PLAYER INTELLIGENCE"
        title="Analytics"
        description="Understand acquisition, activation, retention, player sentiment, and the experiences most likely to influence long-term server health."
        server={server}
        setServer={setServer}
        action={
          <button className="button button--secondary">
            <Download /> Export dataset
          </button>
        }
      />
      <div className="owner-analytics-nav">
        <div>
          {["Overview", "Acquisition", "Retention", "Experience", "Feedback"].map((item) => (
            <button className={tab === item ? "active" : ""} onClick={() => setTab(item)} key={item}>
              {item}
            </button>
          ))}
        </div>
        <label>
          <Clock3 />
          <select value={range} onChange={(event) => setRange(event.target.value)}>
            <option>Last 7 days</option>
            <option>Last 30 days</option>
            <option>Last 90 days</option>
            <option>Season to date</option>
          </select>
        </label>
      </div>

      <div className="owner-kpi-grid owner-kpi-grid--analytics">
        {[
          ["Qualified joins", (analytics?.totals.joins ?? 0).toLocaleString(), "Observed", "seeded campaign join events"],
          ["Server connections", (analytics?.totals.connections ?? 0).toLocaleString(), "Observed", "seeded connection events"],
          ["Unique active players", (analytics?.totals.uniquePlayers ?? 0).toLocaleString(), "Observed", "distinct event users"],
          ["D7 retention", analytics?.retention.day7 == null ? "Insufficient data" : `${analytics.retention.day7}%`, "Backend", analytics?.retention.label ?? "Loading"],
          ["Participation records", (analytics?.totals.participations ?? 0).toLocaleString(), "Stored", "campaign participation rows"],
        ].map(([label, value, delta, note]) => (
          <article className="card owner-kpi" key={label}>
            <small>{label}</small>
            <strong>{value}</strong>
            <p className="positive">
              <ArrowUpRight />
              {delta} <span>{note}</span>
            </p>
          </article>
        ))}
      </div>

      <div className="owner-dashboard-grid">
        <section className="card owner-trend-card">
          <div className="owner-card-heading">
            <div>
              <h2>{tab} trend</h2>
              <p>Comparable, privacy-conscious player signals across the selected period.</p>
            </div>
            <span className="owner-quality-chip">
              <ShieldCheck /> 96% data quality
            </span>
          </div>
          <div className="owner-dual-trend" aria-label="Primary and comparison analytics trend">
            {trendBars.map((height, index) => (
              <i style={{ height: `${height}%` }} key={index}>
                <b style={{ height: `${Math.max(14, height * 0.62)}%` }} />
              </i>
            ))}
          </div>
          <div className="owner-chart-axis">
            <span>Jun 21</span>
            <span>Jun 28</span>
            <span>Jul 5</span>
            <span>Jul 12</span>
            <span>Today</span>
          </div>
        </section>
        <section className="card">
          <div className="owner-card-heading">
            <div>
              <h2>Player segments</h2>
              <p>How this period’s active audience is composed.</p>
            </div>
            <Users />
          </div>
          <div className="owner-segment-donut">
            <div>
              <span>
                {analytics?.totals.uniquePlayers ?? 0}<small>active players</small>
              </span>
            </div>
            <ul>
              <li>
                <i /> New this period <b>42%</b>
              </li>
              <li>
                <i /> Returning regulars <b>31%</b>
              </li>
              <li>
                <i /> Re-engaged <b>17%</b>
              </li>
              <li>
                <i /> At risk <b>10%</b>
              </li>
            </ul>
          </div>
          <button className="owner-text-button">
            Build a segment <ArrowUpRight />
          </button>
        </section>
      </div>

      <div className="owner-analytics-panels">
        <section className="card">
          <div className="owner-card-heading">
            <div>
              <h2>Retention curve</h2>
              <p>Share of a new-player cohort returning after its first session.</p>
            </div>
            <TrendingUp />
          </div>
          <div className="retention-chart">
            {retentionBars.map((height, index) => (
              <div key={index}>
                <i style={{ height: `${height}%` }} />
                <span>{index === 0 ? "Day 0" : `Day ${index}`}</span>
                <b>{height}%</b>
              </div>
            ))}
          </div>
          <div className="owner-benchmark">
            <CheckCircle2 />
            <span>
              <strong>Above category benchmark</strong>
              <small>Your Day 7 retention is 6.8 points above similar Economy servers.</small>
            </span>
          </div>
        </section>
        <section className="card">
          <div className="owner-card-heading">
            <div>
              <h2>Acquisition sources</h2>
              <p>Qualified joins attributed to the last meaningful source.</p>
            </div>
            <Network />
          </div>
          {[
            ["Nortix discovery", "1,604", "43.2%", 86],
            ["Direct / saved server", "912", "24.6%", 62],
            ["Friend or referral", "681", "18.3%", 47],
            ["Campaign participation", "332", "8.9%", 29],
            ["Other", "185", "5.0%", 18],
          ].map(([label, value, percent, width]) => (
            <div className="owner-source-row" key={label}>
              <span>
                <strong>{label}</strong>
                <small>{value} joins</small>
              </span>
              <div>
                <i style={{ width: `${width}%` }} />
              </div>
              <b>{percent}</b>
            </div>
          ))}
        </section>
        <section className="card">
          <div className="owner-card-heading">
            <div>
              <h2>Experience signals</h2>
              <p>Where feedback and behavior point in the same direction.</p>
            </div>
            <MessageSquareText />
          </div>
          {[
            ["Tutorial clarity", "Strong", "+12% activation", "positive"],
            ["Spawn navigation", "Needs work", "18% early exits", "warning"],
            ["Economy pacing", "Mixed", "Wide cohort variance", "neutral"],
            ["Community welcome", "Strong", "+9% D7 retention", "positive"],
          ].map(([label, signal, impact, tone]) => (
            <div className="owner-experience-row" key={label}>
              <span>
                <strong>{label}</strong>
                <small>{impact}</small>
              </span>
              <i className={tone}>{signal}</i>
            </div>
          ))}
        </section>
      </div>

      <section className="card">
        <div className="owner-card-heading">
          <div>
            <h2>Cohort explorer</h2>
            <p>Compare how audience, version, source, and first-session behavior relate to return outcomes.</p>
          </div>
          <button>
            <Filter /> Edit dimensions
          </button>
        </div>
        <div className="owner-table-wrap">
          <table className="owner-table">
            <thead>
              <tr>
                <th>Cohort</th>
                <th>Players</th>
                <th>Activated</th>
                <th>Median session</th>
                <th>Day 1</th>
                <th>Day 7</th>
                <th>Day 30</th>
                <th>Sentiment</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Java · Nortix discovery", "1,842", "68.2%", "52m", "56.4%", "42.8%", "24.1%", "4.7"],
                ["Bedrock · Nortix discovery", "1,104", "54.7%", "39m", "47.1%", "31.6%", "17.8%", "4.2"],
                ["Java · Friend referral", "918", "72.1%", "58m", "61.8%", "48.3%", "29.4%", "4.8"],
                ["Returning after 30d+", "642", "63.9%", "49m", "52.2%", "39.7%", "22.6%", "4.5"],
              ].map((row) => (
                <tr key={row[0]}>
                  {row.map((cell, index) => (
                    <td key={`${row[0]}-${index}`}>{index === 0 ? <strong>{cell}</strong> : cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function PluginServers({ server, setServer }: { server: ServerRecord; setServer: (server: ServerRecord) => void }) {
  const { servers: accessibleServers } = useContext(OwnerServersContext);
  const [servers, setServers] = useState(accessibleServers);
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState("");
  const [connectionToken, setConnectionToken] = useState<{
    serverId: string;
    token: string;
  } | null>(null);
  const [connectionMessage, setConnectionMessage] = useState("");
  const [capabilities, setCapabilities] = useState<PluginCapabilityInfo[]>([]);
  const filtered = useMemo(() => servers.filter((item) => `${item.name} ${item.address} ${item.status}`.toLowerCase().includes(query.toLowerCase())), [query, servers]);
  const togglePause = (id: string) => setServers((items) => items.map((item) => (item.id === id ? { ...item, status: item.status === "Paused" ? "Live" : "Paused" } : item)));
  useEffect(() => setServers(accessibleServers), [accessibleServers]);
  useEffect(() => {
    setConnectionToken(null);
    api<{ pluginCapabilities: PluginCapabilityInfo[] }>(`/owner/servers/${server.id}/plugin-capabilities`)
      .then((result) => setCapabilities(result.pluginCapabilities ?? []))
      .catch(() => setCapabilities([]));
  }, [server.id]);

  const generatePluginToken = async () => {
    setConnectionMessage("");
    try {
      const result = await api<{ serverId: string; token: string }>(`/owner/servers/${server.id}/plugin-token`, { method: "POST" });
      setConnectionToken(result);
    } catch (error) {
      setConnectionMessage(error instanceof Error ? error.message : "A plugin token could not be generated.");
    }
  };

  return (
    <div className="dashboard-page owner-platform">
      <OwnerHeader
        eyebrow="PLUGIN & SERVER REGISTRY"
        title="Connected servers"
        description="One owner account can register multiple Minecraft servers. Monitor plugin health, event collection, configuration, and discovery readiness from one place."
        server={server}
        setServer={setServer}
        action={
          <Link className="button button--primary" to="/owner/servers/new">
            <Plus /> Register server
          </Link>
        }
      />
      <div className="owner-plugin-summary">
        <article className="card">
          <span>
            <Server />
          </span>
          <div>
            <small>Registered servers</small>
            <strong>{servers.length}</strong>
            <p>2 healthy · 1 needs attention</p>
          </div>
        </article>
        <article className="card">
          <span>
            <Radio />
          </span>
          <div>
            <small>Events received today</small>
            <strong>18.4K</strong>
            <p className="positive">+12% vs daily average</p>
          </div>
        </article>
        <article className="card">
          <span>
            <Gauge />
          </span>
          <div>
            <small>Collection success</small>
            <strong>99.82%</strong>
            <p>34 events retried automatically</p>
          </div>
        </article>
        <article className="card">
          <span>
            <ShieldCheck />
          </span>
          <div>
            <small>Data health</small>
            <strong>Good</strong>
            <p>1 plugin update recommended</p>
          </div>
        </article>
      </div>

      <section className="card owner-server-registry">
        <div className="owner-card-heading">
          <div>
            <h2>Active server registry</h2>
            <p>Servers linked to this owner account and authorized to send privacy-conscious gameplay events.</p>
          </div>
          <label className="owner-registry-search">
            <Search />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search servers..." />
          </label>
        </div>
        {filtered.map((item) => (
          <article className="owner-registry-row" key={item.id}>
            <button className="owner-server-mark" onClick={() => setServer(item)}>
              {item.name.slice(0, 2).toUpperCase()}
            </button>
            <div className="owner-registry-row__identity">
              <strong>{item.name}</strong>
              <span>
                {item.address} · Minecraft {item.version}
              </span>
              <StatusDot status={item.status} />
              {item.accessType === "TEAM" && <i className="owner-access-label">Team access · {item.teamRole?.toLowerCase()}</i>}
            </div>
            <div>
              <small>Plugin</small>
              <strong>{item.plugin}</strong>
              <span>{item.id === "factions-legacy" ? "Update available" : "Current"}</span>
            </div>
            <div>
              <small>Last heartbeat</small>
              <strong>{item.heartbeat}</strong>
              <span>{item.status === "Attention" ? "Delayed" : "Normal"}</span>
            </div>
            <div>
              <small>Events this month</small>
              <strong>{item.events}</strong>
              <span>{item.id === "skyblock-x" ? "99.9% accepted" : "99.7% accepted"}</span>
            </div>
            <div className="owner-registry-actions">
              <button onClick={() => togglePause(item.id)}>
                {item.status === "Paused" ? <RefreshCw /> : <Pause />}
                {item.status === "Paused" ? "Resume" : "Pause"}
              </button>
              <button>
                <Settings /> Configure
              </button>
              <button aria-label={`More actions for ${item.name}`}>
                <MoreHorizontal />
              </button>
            </div>
          </article>
        ))}
      </section>

      <section className="card owner-milestone-connect">
        <div className="owner-card-heading">
          <div>
            <h2>Milestone tracking connection</h2>
            <p>Connect the Paper plugin separately on this server. Proxy child servers inherit ownership verification, but keep isolated tokens, events, and milestone capabilities.</p>
          </div>
          {server.accessType === "TEAM" ? (
            <span className="owner-team-chip">Only the server owner can rotate its plugin token</span>
          ) : (
            <button className="button button--primary" onClick={generatePluginToken}>
              <KeyRound /> Generate connection token
            </button>
          )}
        </div>
        {connectionMessage && <div className="owner-team-message">{connectionMessage}</div>}
        {connectionToken && (
          <div className="owner-token-panel">
            <div>
              <strong>Copy this command now</strong>
              <small>The token is shown once. Generating another token immediately revokes this one.</small>
            </div>
            <code>
              Paper: /nortix connect {connectionToken.serverId} {connectionToken.token}
              <br />
              Velocity: /nortixproxy connect {connectionToken.serverId} {connectionToken.token}
            </code>
            <button
              onClick={() => {
                navigator.clipboard.writeText(`/nortix connect ${connectionToken.serverId} ${connectionToken.token}\n/nortixproxy connect ${connectionToken.serverId} ${connectionToken.token}`);
                setCopied("token");
              }}
            >
              <Copy />
              {copied === "token" ? "Copied" : "Copy"}
            </button>
          </div>
        )}
        <div className="owner-capability-list">
          <div className="owner-capability-list__heading">
            <strong>Detected milestone providers</strong>
            <span>{capabilities.length ? `${capabilities.length} connected` : "Waiting for plugin heartbeat"}</span>
          </div>
          {capabilities.length ? (
            capabilities.map((capability) => (
              <article key={capability.id}>
                <span>
                  <Plug />
                </span>
                <div>
                  <strong>{capability.provider}</strong>
                  <small>
                    {capability.category.toLowerCase()} · {capability.version || "detected"}
                  </small>
                </div>
                <p>{capability.metrics.map((metric) => metric.toLowerCase().replaceAll("_", " ")).join(" · ")}</p>
                <i>Available</i>
              </article>
            ))
          ) : (
            <div className="owner-team-empty">
              <Radio />
              <span>
                <strong>No capability report yet</strong>
                <small>Install plugin v0.4.0, run the connection command, and the campaign builder will update automatically.</small>
              </span>
            </div>
          )}
        </div>
      </section>

      <div className="owner-dashboard-grid">
        <section className="card owner-plugin-install">
          <div className="owner-card-heading">
            <div>
              <h2>Ownership verification plugins</h2>
              <p>Use Paper for a standalone server or Velocity for the public entry point to a network.</p>
            </div>
            <Plug />
          </div>
          <ol>
            <li>
              <b>1</b>
              <span>
                <strong>Paper 1.16 and newer</strong>
                <small>Install on every backend that should verify milestones. Version 0.4 adds activity eligibility snapshots and public profile lookup.</small>
              </span>
              <a className="button" href="/downloads/nortix-paper-0.4.0.jar" download>
                <Download /> Paper .jar
              </a>
            </li>
            <li>
              <b>2</b>
              <span>
                <strong>Velocity 3.x proxy</strong>
                <small>Verify the public proxy once, report network activity, and offer public profile lookup across the network.</small>
              </span>
              <a className="button" href="/downloads/nortix-velocity-0.4.0.jar" download>
                <Download /> Velocity .jar
              </a>
            </li>
            <li>
              <b>3</b>
              <span>
                <strong>Generate a one-time code</strong>
                <small>Register the public address, then copy the 15-minute code into the matching plugin command.</small>
              </span>
              <Link className="button" to="/owner/servers/new">
                <KeyRound /> Register server
              </Link>
            </li>
            <li>
              <b>4</b>
              <span>
                <strong>Let Nortix read the MOTD</strong>
                <small>The plugin publishes the code temporarily; an independent public status ping completes the claim.</small>
              </span>
              <button onClick={() => setCopied("flow")}>
                <Copy />
                {copied === "flow" ? "Ready" : "View flow"}
              </button>
            </li>
          </ol>
          <p className="owner-security-note">
            <LockKeyhole /> These plugins only perform registration and ownership verification. They do not collect gameplay or player data.
          </p>
        </section>
        <section className="card">
          <div className="owner-card-heading">
            <div>
              <h2>Live event stream</h2>
              <p>Recent accepted plugin signals.</p>
            </div>
            <span className="live-pill">LIVE</span>
          </div>
          <div className="owner-event-stream">
            {[
              ["18:42:09", "player_objective", "Skyblock X", "accepted"],
              ["18:42:07", "session_heartbeat", "PrisonCraft", "accepted"],
              ["18:41:58", "tutorial_complete", "Skyblock X", "accepted"],
              ["18:41:52", "server_heartbeat", "Factions Legacy", "delayed"],
              ["18:41:46", "player_disconnect", "PrisonCraft", "accepted"],
            ].map(([time, event, source, state]) => (
              <div key={`${time}-${event}`}>
                <code>{time}</code>
                <span>
                  <strong>{event}</strong>
                  <small>{source}</small>
                </span>
                <i className={state}>{state}</i>
              </div>
            ))}
          </div>
          <button className="owner-text-button">
            Open event diagnostics <ArrowUpRight />
          </button>
        </section>
      </div>
    </div>
  );
}

function OwnerSettings({ server, setServer }: { server: ServerRecord; setServer: (server: ServerRecord) => void }) {
  const [discovery, setDiscovery] = useState(server.discovery);
  const [searchListing, setSearchListing] = useState(true);
  const [earnSparks, setEarnSparks] = useState(true);
  const [spendSparks, setSpendSparks] = useState(true);
  const [sparksAlerts, setSparksAlerts] = useState(true);
  const [campaignAlerts, setCampaignAlerts] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(true);
  const [incidentAlerts, setIncidentAlerts] = useState(true);
  const [saved, setSaved] = useState(false);
  const [section, setSection] = useState("Discovery");
  const [teamInvites, setTeamInvites] = useState<TeamInvite[]>([]);
  const [team, setTeam] = useState<TeamOverview | null>(null);
  const [inviteUsername, setInviteUsername] = useState("");
  const [inviteRole, setInviteRole] = useState<TeamInvite["role"]>("MANAGER");
  const [teamMessage, setTeamMessage] = useState("");
  const [teamBusy, setTeamBusy] = useState("");
  const { refreshServers } = useContext(OwnerServersContext);
  const { data: notificationPreferences } = useNotificationPreferences();

  useEffect(() => {
    if (!notificationPreferences) return;
    setSparksAlerts(notificationPreferences.sparksActivity);
    setCampaignAlerts(notificationPreferences.campaignActivity);
    setWeeklyDigest(notificationPreferences.productUpdates);
    setIncidentAlerts(notificationPreferences.serverOperations);
  }, [notificationPreferences]);

  const saveSettings = async () => {
    setSaved(false);
    try {
      await api("/notification-preferences", {
        method: "PUT",
        body: JSON.stringify({
          campaignActivity: campaignAlerts,
          questsAndStreaks: notificationPreferences?.questsAndStreaks ?? true,
          sparksActivity: sparksAlerts,
          serverOperations: incidentAlerts,
          teamActivity: notificationPreferences?.teamActivity ?? true,
          productUpdates: weeklyDigest,
          emailProductUpdates: false,
        }),
      });
      setSaved(true);
    } catch (error) {
      setTeamMessage(error instanceof Error ? error.message : "Notification preferences could not be saved.");
    }
  };

  const loadTeam = async () => {
    const invitations = await api<TeamInvite[]>("/team/invites");
    setTeamInvites(invitations);
    if (server.accessType !== "TEAM") {
      const overview = await api<TeamOverview>(`/owner/servers/${server.id}/team`).catch(() => null);
      setTeam(overview);
    } else setTeam(null);
  };

  useEffect(() => {
    loadTeam().catch(() => undefined);
  }, [server.id, server.accessType]);

  const answerInvite = async (inviteId: string, action: "ACCEPT" | "DECLINE") => {
    setTeamBusy(inviteId);
    setTeamMessage("");
    try {
      await api(`/team/invites/${inviteId}`, { method: "PATCH", body: JSON.stringify({ action }) });
      setTeamMessage(action === "ACCEPT" ? "Invite accepted. The server is now available in your management workspace." : "Invite declined.");
      await Promise.all([loadTeam(), refreshServers()]);
    } catch (error) {
      setTeamMessage(error instanceof Error ? error.message : "The invite could not be updated.");
    } finally {
      setTeamBusy("");
    }
  };

  const sendInvite = async (event: React.FormEvent) => {
    event.preventDefault();
    setTeamBusy("send");
    setTeamMessage("");
    try {
      await api(`/owner/servers/${server.id}/team/invites`, {
        method: "POST",
        body: JSON.stringify({ username: inviteUsername.replace(/^@/, ""), role: inviteRole }),
      });
      setInviteUsername("");
      setTeamMessage("Invite sent. It will remain available for seven days.");
      await loadTeam();
    } catch (error) {
      setTeamMessage(error instanceof Error ? error.message : "The invite could not be sent.");
    } finally {
      setTeamBusy("");
    }
  };

  const changeMemberRole = async (memberId: string, role: TeamInvite["role"]) => {
    setTeamBusy(memberId);
    try {
      await api(`/owner/servers/${server.id}/team/members/${memberId}`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      });
      await loadTeam();
    } catch (error) {
      setTeamMessage(error instanceof Error ? error.message : "The member role could not be changed.");
    } finally {
      setTeamBusy("");
    }
  };

  const removeMember = async (memberId: string) => {
    setTeamBusy(memberId);
    try {
      await api(`/owner/servers/${server.id}/team/members/${memberId}`, { method: "DELETE" });
      setTeamMessage("Team access revoked.");
      await loadTeam();
    } catch (error) {
      setTeamMessage(error instanceof Error ? error.message : "Access could not be revoked.");
    } finally {
      setTeamBusy("");
    }
  };

  const revokeInvite = async (inviteId: string) => {
    setTeamBusy(inviteId);
    try {
      await api(`/owner/servers/${server.id}/team/invites/${inviteId}`, { method: "DELETE" });
      setTeamMessage("Pending invite revoked.");
      await loadTeam();
    } catch (error) {
      setTeamMessage(error instanceof Error ? error.message : "The invite could not be revoked.");
    } finally {
      setTeamBusy("");
    }
  };

  const groups = ["Discovery", "Sparks", "Notifications", "Data & privacy", "Team access", "Security"];
  return (
    <div className="dashboard-page owner-platform">
      <OwnerHeader
        eyebrow="OWNER CONFIGURATION"
        title="Settings"
        description="Control how each server appears, how Sparks features behave, what data is collected, and who receives operational updates."
        server={server}
        setServer={setServer}
        action={
          <button className="button button--primary" onClick={saveSettings}>
            <Save />
            {saved ? "Changes saved" : "Save changes"}
          </button>
        }
      />
      <div className="owner-settings-layout">
        <nav>
          {groups.map((item) => (
            <button className={section === item ? "active" : ""} onClick={() => setSection(item)} key={item}>
              {item === "Discovery" ? <Globe2 /> : item === "Sparks" ? <Sparkles /> : item === "Notifications" ? <Bell /> : item === "Data & privacy" ? <Database /> : item === "Team access" ? <Users /> : <KeyRound />}
              {item}
            </button>
          ))}
        </nav>
        <main>
          {section === "Discovery" && (
            <>
              <SettingsHeading icon={Globe2} title="Discovery visibility" description={`Control whether ${server.name} can appear in Nortix browsing, search, and recommendations.`} />
              <SettingRow title="Enable server discovery" description="Allow this server to appear in Nortix discovery surfaces. Disabling it does not remove historical analytics." checked={discovery} onChange={setDiscovery} />
              <SettingRow title="Appear in search results" description="Let players find this server by name, category, edition, and supported version." checked={searchListing} onChange={setSearchListing} disabled={!discovery} />
              <SettingRow title="Personalized recommendations" description="Allow Nortix to recommend this server when player preferences and server characteristics may align." checked={discovery && searchListing} onChange={setSearchListing} disabled={!discovery} />
              <div className="owner-setting-note">
                <Eye />
                <span>
                  <strong>Current visibility preview</strong>
                  <p>{discovery ? `${server.name} may appear in discovery, search, and eligible recommendation modules.` : `${server.name} is hidden from discovery. Direct server links and owner analytics remain available.`}</p>
                </span>
              </div>
            </>
          )}
          {section === "Sparks" && (
            <>
              <SettingsHeading icon={Sparkles} title="Sparks controls" description="Choose which optional Sparks features are available for this server and its campaigns." />
              <SettingRow title="Allow players to potentially earn Sparks" description="Eligible, verified campaign activity may provide Sparks up to the published limit." checked={earnSparks} onChange={setEarnSparks} />
              <SettingRow title="Allow Sparks spending features" description="Enable eligible server-linked cosmetics, boosts, or optional experiences that use Sparks." checked={spendSparks} onChange={setSpendSparks} />
              <SettingRow title="Sparks activity notifications" description="Notify owners about limit thresholds, unusual activity, and completed verification batches." checked={sparksAlerts} onChange={setSparksAlerts} />
              <label className="owner-setting-field">
                <span>
                  <strong>Default campaign limit</strong>
                  <small>New campaigns may use this upper limit unless changed before submission.</small>
                </span>
                <select defaultValue="75">
                  <option value="25">Up to 25 Sparks</option>
                  <option value="50">Up to 50 Sparks</option>
                  <option value="75">Up to 75 Sparks</option>
                  <option value="100">Up to 100 Sparks</option>
                </select>
              </label>
              <label className="owner-setting-field">
                <span>
                  <strong>Monthly exposure alert</strong>
                  <small>Send an alert when configured potential Sparks reach this share of your monthly limit.</small>
                </span>
                <select defaultValue="80">
                  <option>60%</option>
                  <option>70%</option>
                  <option>80%</option>
                  <option>90%</option>
                </select>
              </label>
            </>
          )}
          {section === "Notifications" && (
            <>
              <SettingsHeading icon={Bell} title="Owner notifications" description="These persisted preferences apply to your Nortix account across every server you own or help manage." />
              <SettingRow title="Campaign activity" description="Campaign joins, milestone results, moderation decisions, and participation changes." checked={campaignAlerts} onChange={setCampaignAlerts} />
              <SettingRow title="Product updates" description="Non-urgent Nortix feature and service announcements in your account inbox." checked={weeklyDigest} onChange={setWeeklyDigest} />
              <SettingRow title="Connection and data incidents" description="Plugin downtime, delayed heartbeats, schema mismatches, and data-quality changes." checked={incidentAlerts} onChange={setIncidentAlerts} />
              <div className="owner-setting-note">
                <ShieldCheck />
                <span>
                  <strong>Security and account notices remain enabled</strong>
                  <p>Critical access and safety messages cannot be disabled. Email delivery remains unavailable until a verified provider is configured.</p>
                </span>
              </div>
              <Link className="owner-text-button" to="/dashboard/inbox">Open your Nortix inbox <ArrowUpRight /></Link>
            </>
          )}
          {section === "Data & privacy" && (
            <>
              <SettingsHeading icon={Database} title="Data collection & privacy" description="Review event collection, retention, exports, and privacy-conscious defaults." />
              <SettingRow title="Product analytics collection" description="Collect supported server events used for aggregate acquisition, activation, and retention analytics." checked={true} onChange={() => undefined} />
              <SettingRow title="Qualitative feedback analysis" description="Include eligible campaign responses in aggregated theme and sentiment analysis." checked={true} onChange={() => undefined} />
              <label className="owner-setting-field">
                <span>
                  <strong>Analytics retention</strong>
                  <small>Aggregate reporting may remain after raw event retention expires.</small>
                </span>
                <select defaultValue="12 months">
                  <option>3 months</option>
                  <option>6 months</option>
                  <option>12 months</option>
                  <option>24 months</option>
                </select>
              </label>
              <button className="owner-settings-action">
                <Download /> Request server data export
              </button>
            </>
          )}
          {section === "Team access" && (
            <>
              <SettingsHeading icon={Users} title="Team access" description="Accept invitations sent to you or invite Nortix users by username to this server." />
              <section className="owner-team-section">
                <div className="owner-team-section__heading">
                  <div>
                    <h3>Your invitations</h3>
                    <p>Accepted servers appear in the server picker and connected-server registry even when you are not the owner.</p>
                  </div>
                  <span>{teamInvites.length} pending</span>
                </div>
                {teamInvites.length === 0 ? (
                  <div className="owner-team-empty">
                    <CheckCircle2 />
                    <span>
                      <strong>No pending invitations</strong>
                      <small>New team invitations for your account will appear here.</small>
                    </span>
                  </div>
                ) : (
                  teamInvites.map((invite) => (
                    <div className="owner-invite-row" key={invite.id}>
                      <span className="owner-server-mark">{invite.server.name.slice(0, 2).toUpperCase()}</span>
                      <span>
                        <strong>{invite.server.name}</strong>
                        <small>
                          @{invite.inviter.username} invited you as {invite.role.toLowerCase()} · expires {new Date(invite.expiresAt).toLocaleDateString()}
                        </small>
                      </span>
                      <button className="owner-invite-decline" disabled={teamBusy === invite.id} onClick={() => answerInvite(invite.id, "DECLINE")}>
                        <X /> Decline
                      </button>
                      <button className="button button--primary" disabled={teamBusy === invite.id} onClick={() => answerInvite(invite.id, "ACCEPT")}>
                        <Check /> Accept
                      </button>
                    </div>
                  ))
                )}
              </section>
              {teamMessage && (
                <div className="owner-team-message" role="status">
                  {teamMessage}
                </div>
              )}
              {server.accessType === "TEAM" ? (
                <div className="owner-setting-note">
                  <Users />
                  <span>
                    <strong>
                      You manage {server.name} as a {server.teamRole?.toLowerCase()}.
                    </strong>
                    <p>This server is owned by another Nortix user. Your available workspace areas are based on the role they assigned.</p>
                  </span>
                </div>
              ) : (
                <section className="owner-team-section">
                  <div className="owner-team-section__heading">
                    <div>
                      <h3>{server.name} team</h3>
                      <p>Only the owner can invite, change roles, or revoke access. Invitees must already have a Nortix account.</p>
                    </div>
                  </div>
                  <form className="owner-invite-form" onSubmit={sendInvite}>
                    <label>
                      <span>Username</span>
                      <div>
                        <b>@</b>
                        <input required minLength={2} maxLength={32} value={inviteUsername} onChange={(event) => setInviteUsername(event.target.value)} placeholder="nortix_username" />
                      </div>
                    </label>
                    <label>
                      <span>Role</span>
                      <select value={inviteRole} onChange={(event) => setInviteRole(event.target.value as TeamInvite["role"])}>
                        <option value="ADMIN">Server admin</option>
                        <option value="MANAGER">Campaign manager</option>
                        <option value="OPERATOR">Server operator</option>
                        <option value="ANALYST">Analyst</option>
                      </select>
                    </label>
                    <button className="button button--primary" disabled={teamBusy === "send"}>
                      <UserPlus />
                      {teamBusy === "send" ? "Sending…" : "Send invite"}
                    </button>
                  </form>
                  <div className="owner-role-guide">
                    <span>
                      <strong>Server admin</strong>
                      <small>All management areas and team controls</small>
                    </span>
                    <span>
                      <strong>Manager</strong>
                      <small>Campaigns and analytics</small>
                    </span>
                    <span>
                      <strong>Operator</strong>
                      <small>Server settings and integrations</small>
                    </span>
                    <span>
                      <strong>Analyst</strong>
                      <small>Analytics only</small>
                    </span>
                  </div>
                  <div className="owner-team-row">
                    <span className="avatar avatar--small">{team?.owner.displayName.slice(0, 2).toUpperCase() ?? "OW"}</span>
                    <span>
                      <strong>{team?.owner.displayName ?? "Server owner"}</strong>
                      <small>@{team?.owner.username ?? "owner"}</small>
                    </span>
                    <b>Owner</b>
                    <i>Active</i>
                    <span />
                  </div>
                  {team?.members.map((member) => (
                    <div className="owner-team-row" key={member.id}>
                      <span className="avatar avatar--small">{member.user.displayName.slice(0, 2).toUpperCase()}</span>
                      <span>
                        <strong>{member.user.displayName}</strong>
                        <small>@{member.user.username}</small>
                      </span>
                      <select disabled={teamBusy === member.id} value={member.role} onChange={(event) => changeMemberRole(member.id, event.target.value as TeamInvite["role"])}>
                        <option value="ADMIN">Server admin</option>
                        <option value="MANAGER">Campaign manager</option>
                        <option value="OPERATOR">Server operator</option>
                        <option value="ANALYST">Analyst</option>
                      </select>
                      <i>Active</i>
                      <button disabled={teamBusy === member.id} onClick={() => removeMember(member.id)} aria-label={`Revoke ${member.user.displayName}'s access`}>
                        <X />
                      </button>
                    </div>
                  ))}
                  {team?.invites.map((invite) => (
                    <div className="owner-team-row is-pending" key={invite.id}>
                      <span className="avatar avatar--small">{invite.invitee.displayName.slice(0, 2).toUpperCase()}</span>
                      <span>
                        <strong>{invite.invitee.displayName}</strong>
                        <small>@{invite.invitee.username}</small>
                      </span>
                      <b>{invite.role.toLowerCase()}</b>
                      <i>Pending</i>
                      <button disabled={teamBusy === invite.id} onClick={() => revokeInvite(invite.id)} aria-label={`Revoke invitation for ${invite.invitee.displayName}`}>
                        <X />
                      </button>
                    </div>
                  ))}
                </section>
              )}
            </>
          )}
          {section === "Security" && (
            <>
              <SettingsHeading icon={KeyRound} title="Security" description="Protect owner access, plugin credentials, and high-impact configuration actions." />
              <SettingRow title="Require two-step verification" description="All team members must use an additional verification step before accessing owner tools." checked={true} onChange={() => undefined} />
              <SettingRow title="Confirm high-impact changes" description="Require re-authentication before disabling discovery, rotating keys, or changing owner access." checked={true} onChange={() => undefined} />
              <div className="owner-setting-note">
                <ShieldCheck />
                <span>
                  <strong>Last security review</strong>
                  <p>No unusual owner access was identified. Three active sessions and three server keys are currently authorized.</p>
                </span>
              </div>
              <button className="owner-settings-action">
                <LockKeyhole /> Review sessions and keys
              </button>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function SettingsHeading({ icon: Icon, title, description }: { icon: typeof Settings; title: string; description: string }) {
  return (
    <div className="owner-settings-heading">
      <span>
        <Icon />
      </span>
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
    </div>
  );
}

function SettingRow({ title, description, checked, onChange, disabled = false }: { title: string; description: string; checked: boolean; onChange: (value: boolean) => void; disabled?: boolean }) {
  return (
    <div className={`owner-setting-row ${disabled ? "is-disabled" : ""}`}>
      <span>
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
      <Toggle checked={checked} onChange={onChange} label={title} />
    </div>
  );
}

function OwnerCredits({ server, setServer }: { server: ServerRecord; setServer: (server: ServerRecord) => void }) {
  const [balance, setBalance] = useState<CampaignCreditBalance>({ availableCredits: 0, purchasedCredits: 0, promotionalCredits: 0, promotionalTerms: "Promotional Campaign Credits may expire.", entries: [] });
  const [ownerCampaigns, setOwnerCampaigns] = useState<Array<{ id: string; serverId: string; status: string; campaignBudgetCredits: number }>>([]);
  const { servers } = useContext(OwnerServersContext);
  const [balanceMessage, setBalanceMessage] = useState("Loading Campaign Credits…");
  useEffect(() => {
    Promise.all([
      api<CampaignCreditBalance>("/owner/campaign-balance"),
      api<Array<{ id: string; serverId: string; status: string; campaignBudgetCredits: number }>>("/owner/campaigns"),
    ])
      .then(([balanceResult, campaignsResult]) => {
        setBalance(balanceResult);
        setOwnerCampaigns(campaignsResult);
        setBalanceMessage("");
      })
      .catch(() => setBalanceMessage("Campaign Credits are available when the owner API is connected."));
  }, []);
  return (
    <div className="dashboard-page owner-platform">
      <OwnerHeader
        eyebrow="CAMPAIGN CREDITS"
        title="Campaign budget"
        description="Review credits available for campaigns. Owner accounts do not hold or spend player Sparks."
        server={server}
        setServer={setServer}
        action={
          <Link className="button button--primary" to="/owner/campaigns/new">
            <Plus /> New campaign
          </Link>
        }
      />
      <div className="owner-kpi-grid owner-kpi-grid--analytics">
        {[
          ["Available Campaign Credits", balance.availableCredits.toLocaleString(), "Maximum available for a new campaign budget"],
          ["Purchased Credits", balance.purchasedCredits.toLocaleString(), "Non-expiring account allocation"],
          ["Promotional Credits", balance.promotionalCredits.toLocaleString(), "Used first and may expire"],
          ["Active campaign budgets", ownerCampaigns.filter((item) => ["SUBMITTED", "UNDER_REVIEW", "APPROVED", "ACTIVE"].includes(item.status)).length.toLocaleString(), "Credits reserved on submission"],
          ["Portfolio campaigns", ownerCampaigns.length.toLocaleString(), "Across owned and managed servers"],
        ].map(([label, value, note]) => (
          <article className="card owner-kpi" key={label}>
            <small>{label}</small>
            <strong>{value}</strong>
            <p>
              <CreditCard />
              <span>{note}</span>
            </p>
          </article>
        ))}
      </div>
      <div className="owner-dashboard-grid">
        <section className="card">
          <div className="owner-card-heading">
            <div>
              <h2>Available balance</h2>
              <p>Campaign budgets cannot exceed this backend-calculated Campaign Credits balance.</p>
            </div>
            <CreditCard />
          </div>
          <div className="owner-limit-control">
            <span>
              <strong>{balance.availableCredits.toLocaleString()} Campaign Credits</strong>
              <small>Available after submitted campaign budgets and expired promotions</small>
            </span>
          </div>
          {balanceMessage && <p className="owner-policy-footnote">{balanceMessage}</p>}
          <p className="owner-policy-footnote"><ShieldCheck /> {balance.promotionalTerms}</p>
        </section>
        <section className="card">
          <div className="owner-card-heading">
            <div>
              <h2>Reserved by server</h2>
              <p>Campaign Credits committed to submitted campaign budgets.</p>
            </div>
            <Server />
          </div>
          {servers.map((item) => {
            const campaigns = ownerCampaigns.filter((campaign) => campaign.serverId === item.id);
            const reserved = campaigns
              .filter((campaign) => campaign.status !== "DRAFT")
              .reduce((total, campaign) => total + campaign.campaignBudgetCredits, 0);
            return (
            <div className="owner-allocation-row" key={item.id}>
              <span className="owner-server-mark">{item.name.slice(0, 2).toUpperCase()}</span>
              <span>
                <strong>{item.name}</strong>
                <small>{campaigns.length} campaigns</small>
              </span>
              <div>
                <i style={{ width: `${Math.min(100, reserved / 100)}%` }} />
              </div>
              <b>{reserved.toLocaleString()} Credits</b>
            </div>
            );
          })}
        </section>
      </div>
      <section className="card">
        <div className="owner-card-heading">
          <div>
            <h2>Campaign Credits activity</h2>
            <p>Purchased, promotional, reserved, expired, and adjusted credit activity.</p>
          </div>
          <button>
            <Download /> Export ledger
          </button>
        </div>
        <div className="owner-table-wrap">
          <table className="owner-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Server</th>
                <th>Campaign</th>
                <th>Activity</th>
                <th>Expiry</th>
                <th>Credits</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {(balance.entries.length
                ? balance.entries.slice(0, 8).map((entry) => [
                    new Date(entry.createdAt).toLocaleString(),
                    "Owner portfolio",
                    entry.referenceType.replaceAll("_", " "),
                    entry.transactionType.replaceAll("_", " "),
                    entry.expiresAt ? new Date(entry.expiresAt).toLocaleDateString() : "No expiry",
                    `${entry.direction === "CREDIT" ? "+" : "−"}${entry.credits.toLocaleString()}`,
                    entry.direction,
                  ])
                : [["—", "—", "No Campaign Credits activity", "—", "—", "0", "—"]]
              ).map((row) => (
                <tr key={`${row[0]}-${row[2]}`}>
                  {row.map((cell, index) => (
                    <td key={`${row[0]}-${index}`}>{index === 2 ? <strong>{cell}</strong> : cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function CampaignBuilder({ server, setServer }: { server: ServerRecord; setServer: (server: ServerRecord) => void }) {
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [builderMessage, setBuilderMessage] = useState("");
  const [campaignTitle, setCampaignTitle] = useState("First island experience");
  const [objective, setObjective] = useState("Understand where new players hesitate or leave during the first island selection and objective flow.");
  const [budgetCredits, setBudgetCredits] = useState(5_000);
  const [creditBalance, setCreditBalance] = useState<CampaignCreditBalance | null>(null);
  const [derivedCapacity, setDerivedCapacity] = useState(172);
  const [estimatedCreditCost, setEstimatedCreditCost] = useState(29);
  const [category, setCategory] = useState("Onboarding");
  const [rewardRange, setRewardRange] = useState("50-100");
  const [suggestions, setSuggestions] = useState<CampaignSuggestion[]>([]);
  const [suggestionsServer, setSuggestionsServer] = useState("");
  const [exposure, setExposure] = useState({ minimum: 100, maximum: 400 });
  const [milestones, setMilestones] = useState<ConfiguredMilestone[]>([]);
  const [milestoneComposerOpen, setMilestoneComposerOpen] = useState(false);
  const [milestoneDraft, setMilestoneDraft] = useState({
    metric: "",
    title: "",
    target: 1,
  });
  const [milestoneDraftMessage, setMilestoneDraftMessage] = useState("");
  const [eligibility, setEligibility] = useState<CampaignEligibility | null>(null);

  useEffect(() => {
    api<CampaignCreditBalance>("/owner/campaign-balance")
      .then((result) => {
        setCreditBalance(result);
        setBudgetCredits((current) => Math.min(current, result.availableCredits));
      })
      .catch((error) => {
        setCreditBalance(null);
        setBuilderMessage(
          error instanceof Error
            ? error.message
            : "The seeded Campaign Credits balance could not be loaded.",
        );
      });
  }, []);

  useEffect(() => {
    setEligibility(null);
    api<CampaignEligibility>(`/owner/servers/${server.id}/campaign-eligibility`)
      .then(setEligibility)
      .catch((error) => {
        setBuilderMessage(error instanceof Error ? error.message : "Campaign eligibility could not be checked.");
      });
  }, [server.id]);

  useEffect(() => {
    const maximumSparksReward = Number(rewardRange.split("-")[1] ?? 100);
    if (budgetCredits < 100) return;
    api<CampaignSuggestionResponse>(`/owner/servers/${server.id}/campaign-suggestions?budgetCredits=${budgetCredits}&maximumSparksReward=${maximumSparksReward}&milestoneCount=${Math.max(1, milestones.length)}`)
      .then((result) => {
        setSuggestions(result.suggestions);
        setExposure(result.exposure);
        setDerivedCapacity(result.derivedCapacity);
        setEstimatedCreditCost(result.estimatedCostPerPotentialParticipant);
        if (suggestionsServer !== server.id) {
          setMilestones(
            result.suggestions
              .filter((item) => item.available && item.recommended)
              .slice(0, 3)
              .map(toConfiguredMilestone),
          );
          setSuggestionsServer(server.id);
        }
      })
      .catch(() => {
        setSuggestions([]);
        setBuilderMessage("Seeded milestone suggestions could not be loaded for this server.");
        const estimatedCost = 10 + Math.ceil(maximumSparksReward / 10) + Math.max(1, milestones.length) * 3;
        const capacity = Math.max(10, Math.min(25_000, Math.floor(budgetCredits / estimatedCost)));
        const minimum = Math.max(10, Math.floor((capacity * 0.2) / 10) * 10);
        setDerivedCapacity(capacity);
        setEstimatedCreditCost(estimatedCost);
        setExposure({ minimum, maximum: Math.max(minimum, Math.floor(capacity * 0.75)) });
      });
  }, [budgetCredits, milestones.length, rewardRange, server.id, suggestionsServer]);

  const selectedMetrics = new Set(milestones.map((item) => item.metric));
  const creatableSuggestions = suggestions.filter(
    (suggestion) => suggestion.available && !selectedMetrics.has(suggestion.metric),
  );
  const [minimumSparks, maximumSparks] = rewardRange.split("-").map(Number) as [number, number];
  const addSuggestion = (suggestion: CampaignSuggestion) => {
    if (!suggestion.available || selectedMetrics.has(suggestion.metric)) return;
    setMilestones((items) => [...items, toConfiguredMilestone(suggestion)].slice(0, 8));
  };
  const openMilestoneComposer = () => {
    const firstSuggestion = creatableSuggestions[0];
    if (milestones.length >= 8) {
      setBuilderMessage("A campaign can contain up to eight milestones.");
      return;
    }
    if (!firstSuggestion) {
      setBuilderMessage("No additional plugin-backed milestone events are available for this server.");
      return;
    }
    setBuilderMessage("");
    setMilestoneDraft({
      metric: firstSuggestion.metric,
      title: firstSuggestion.title,
      target: firstSuggestion.suggestedTarget,
    });
    setMilestoneDraftMessage("");
    setMilestoneComposerOpen(true);
  };
  const selectMilestoneMetric = (metric: string) => {
    const suggestion = creatableSuggestions.find((item) => item.metric === metric);
    if (!suggestion) return;
    setMilestoneDraft({
      metric: suggestion.metric,
      title: suggestion.title,
      target: suggestion.suggestedTarget,
    });
    setMilestoneDraftMessage("");
  };
  const createMilestone = () => {
    const suggestion = creatableSuggestions.find((item) => item.metric === milestoneDraft.metric);
    const title = milestoneDraft.title.trim();
    if (!suggestion) {
      setMilestoneDraftMessage("Choose an event supported by this server's plugin.");
      return;
    }
    if (title.length < 3 || title.length > 56) {
      setMilestoneDraftMessage("Use a clear title between 3 and 56 characters.");
      return;
    }
    if (!Number.isInteger(milestoneDraft.target) || milestoneDraft.target < 1) {
      setMilestoneDraftMessage("Target must be a whole number greater than zero.");
      return;
    }
    if (milestoneDraft.target > suggestion.maximumTarget) {
      setMilestoneDraftMessage(
        `The maximum safe target for this event is ${suggestion.maximumTarget.toLocaleString()}.`,
      );
      return;
    }
    setMilestones((items) => [
      ...items,
      {
        id: crypto.randomUUID(),
        metric: suggestion.metric,
        target: milestoneDraft.target,
        scope: suggestion.scope,
        title,
      },
    ].slice(0, 8));
    setMilestoneComposerOpen(false);
    setMilestoneDraftMessage("");
  };

  const submitCampaign = async () => {
    if (!eligibility?.eligible) {
      setBuilderMessage("This server needs at least 10 average active players and a current plugin activity history before it can run campaigns.");
      return;
    }
    if (!milestones.length) {
      setBuilderMessage("Choose at least one suggested milestone.");
      return;
    }
    if (campaignTitle.trim().length < 6 || objective.trim().length < 30) {
      setBuilderMessage("Add a short title and a clear objective before submitting.");
      return;
    }
    if (!creditBalance || budgetCredits < 100 || budgetCredits > creditBalance.availableCredits) {
      setBuilderMessage("Choose a Campaign Credits budget within your available account balance.");
      return;
    }
    setSaving(true);
    setBuilderMessage("");
    try {
      const created = await api<{ id: string }>("/owner/campaigns", {
        method: "POST",
        body: JSON.stringify({
          serverId: server.id,
          title: campaignTitle.trim(),
          description: objective.trim(),
          category,
          startsAt: new Date().toISOString(),
          endsAt: new Date(Date.now() + 30 * 86_400_000).toISOString(),
          budgetCredits,
          sparksRewardRange: {
            minimum: minimumSparks,
            maximum: maximumSparks,
          },
          regionRestrictions: [],
          versionRequirements: [server.version],
          milestones: milestones.map((item) => ({
            templateType: item.metric,
            title: `${item.title} · ${item.target.toLocaleString()}`,
            instructions: `${item.title} on ${item.scope === "SERVER" ? server.name : "this proxy network"}. Nortix checks progress automatically from safeguarded plugin data.`,
            rewardCents: 0,
            verificationMethod: "SERVER_PLUGIN",
            config: { metric: item.metric, target: item.target, scope: item.scope },
          })),
        }),
      });
      await api(`/owner/campaigns/${created.id}/submit`, { method: "POST" });
      setSaved(true);
      setBuilderMessage("Campaign submitted with automatic plugin milestone verification.");
    } catch (error) {
      setBuilderMessage(error instanceof Error ? error.message : "The campaign could not be submitted.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="dashboard-page owner-platform">
      <OwnerHeader
        eyebrow="CAMPAIGN BUILDER"
        title="Create a campaign"
        description="Pick a goal, accept suggested milestones, and fund the campaign with Campaign Credits. Nortix handles verification."
        server={server}
        setServer={setServer}
        action={
          <Link className="button button--secondary" to="/owner">
            Exit builder
          </Link>
        }
      />
      <div className="owner-campaign-simple">
        <section className="card owner-campaign-simple__main">
          <div className="owner-simple-heading">
            <span>1</span>
            <div>
              <h2>Campaign details</h2>
              <p>Keep it short so players can understand the campaign at a glance.</p>
            </div>
          </div>
          <div className="form-grid form-grid--two owner-compact-fields">
            <label>
              Short title <small>{campaignTitle.length}/64</small>
              <input maxLength={64} value={campaignTitle} onChange={(event) => setCampaignTitle(event.target.value)} />
            </label>
            <label>
              Goal
              <select value={category} onChange={(event) => setCategory(event.target.value)}>
                <option>Onboarding</option>
                <option>Retention</option>
                <option>Feature evaluation</option>
                <option>Usability</option>
                <option>Balance testing</option>
              </select>
            </label>
            <label className="span-two">
              What should players help you learn? <small>{objective.length}/320</small>
              <textarea maxLength={320} rows={3} value={objective} onChange={(event) => setObjective(event.target.value)} />
            </label>
          </div>

          <div className="owner-simple-heading">
            <span>2</span>
            <div>
              <h2>Suggested milestones</h2>
              <p>Suggestions come from the capabilities reported by the plugin on {server.name}.</p>
            </div>
          </div>
          <div className="owner-auto-note">
            <ShieldCheck />
            <span>
              <strong>Automatic by default</strong>
              <small>Nortix verifies eligible milestones from authenticated, server-bound plugin events. Manual player or owner confirmation is not requested.</small>
            </span>
          </div>
          <div className="owner-suggestion-grid">
            {suggestions.map((suggestion) => {
              const selected = selectedMetrics.has(suggestion.metric);
              return (
                <button type="button" disabled={!suggestion.available || selected} className={selected ? "selected" : ""} onClick={() => addSuggestion(suggestion)} key={suggestion.metric}>
                  <span>{selected ? <CheckCircle2 /> : suggestion.available ? <Plus /> : <LockKeyhole />}</span>
                  <div>
                    <strong>{suggestion.title}</strong>
                    <small>{suggestion.description}</small>
                    <i>{suggestion.recommended ? "Suggested" : suggestion.available ? "Available" : "Plugin capability required"}</i>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="owner-configured-milestones owner-configured-milestones--simple">
            <div className="owner-configured-milestones__heading">
              <span>
                <strong>Campaign milestones</strong>
                <small>{milestones.length} of 8 created</small>
              </span>
              <button
                type="button"
                className="button button--secondary owner-create-milestone"
                onClick={openMilestoneComposer}
              >
                <Plus /> Create milestone
              </button>
            </div>
            {milestoneComposerOpen ? (
              <div className="owner-milestone-composer">
                <div>
                  <strong>Create milestone</strong>
                  <small>Choose a plugin-backed event so progress can be verified automatically.</small>
                </div>
                <div className="owner-milestone-composer__fields">
                  <label>
                    Event
                    <select value={milestoneDraft.metric} onChange={(event) => selectMilestoneMetric(event.target.value)}>
                      {creatableSuggestions.map((suggestion) => (
                        <option value={suggestion.metric} key={suggestion.metric}>
                          {suggestion.title}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Player-facing title <small>{milestoneDraft.title.length}/56</small>
                    <input
                      maxLength={56}
                      value={milestoneDraft.title}
                      onChange={(event) => setMilestoneDraft((draft) => ({ ...draft, title: event.target.value }))}
                    />
                  </label>
                  <label>
                    Target
                    <input
                      type="number"
                      min="1"
                      max={creatableSuggestions.find((item) => item.metric === milestoneDraft.metric)?.maximumTarget}
                      step="1"
                      value={milestoneDraft.target}
                      onChange={(event) => setMilestoneDraft((draft) => ({ ...draft, target: Number(event.target.value) }))}
                    />
                  </label>
                </div>
                {milestoneDraftMessage ? <p role="alert">{milestoneDraftMessage}</p> : null}
                <div className="owner-milestone-composer__actions">
                  <button type="button" className="button button--secondary" onClick={() => setMilestoneComposerOpen(false)}>
                    Cancel
                  </button>
                  <button type="button" className="button button--primary" onClick={createMilestone}>
                    <Plus /> Add milestone
                  </button>
                </div>
              </div>
            ) : null}
            {milestones.length === 0 ? (
              <p>Create a milestone or add one of the suggestions above.</p>
            ) : (
              milestones.map((item, index) => (
                <article key={item.id}>
                  <b>{index + 1}</b>
                  <span>
                    <strong>{item.title}</strong>
                    <small>{item.scope === "SERVER" ? server.name : "Proxy network"} · automatically verified</small>
                  </span>
                  <label>
                    Target
                    <input
                      type="number"
                      min="1"
                      max={suggestions.find((suggestion) => suggestion.metric === item.metric)?.maximumTarget}
                      value={item.target}
                      onChange={(event) => {
                        const maximumTarget = suggestions.find((suggestion) => suggestion.metric === item.metric)?.maximumTarget ?? Number.MAX_SAFE_INTEGER;
                        const target = Math.max(1, Math.min(maximumTarget, Number(event.target.value)));
                        setMilestones((items) => items.map((milestone) => (milestone.id === item.id ? { ...milestone, target } : milestone)));
                      }}
                    />
                  </label>
                  <button type="button" onClick={() => setMilestones((items) => items.filter((milestone) => milestone.id !== item.id))} aria-label={`Remove ${item.title}`}>
                    <X />
                  </button>
                </article>
              ))
            )}
          </div>
        </section>

        <aside className="owner-campaign-simple__side">
          <section className="card">
            <div className={`owner-eligibility ${eligibility?.eligible ? "is-eligible" : ""}`}>
              <span>{eligibility?.eligible ? <CheckCircle2 /> : <Gauge />}</span>
              <div>
                <strong>{eligibility?.eligible ? "Campaign eligible" : "Eligibility required"}</strong>
                <small>
                  {eligibility
                    ? `${eligibility.averagePlayers.toFixed(1)} average active players from ${eligibility.sampleCount} recent samples. Minimum: ${eligibility.minimumAveragePlayers}.`
                    : "Checking the server’s recent plugin activity…"}
                </small>
              </div>
            </div>
            <div className="owner-simple-heading">
              <span>3</span>
              <div>
                <h2>Rewards & reach</h2>
                <p>Directional limits, not delivery promises.</p>
              </div>
            </div>
            <label className="owner-simple-field">
              Potential Sparks range
              <select value={rewardRange} onChange={(event) => setRewardRange(event.target.value)}>
                <option value="25-50">25–50 Sparks</option>
                <option value="50-100">50–100 Sparks</option>
                <option value="100-200">100–200 Sparks</option>
                <option value="200-350">200–350 Sparks</option>
              </select>
              <small>Players may receive an amount within this range after eligible milestones are verified.</small>
            </label>
            <label className="owner-simple-field">
              Campaign Credits budget
              <input
                type="number"
                min="100"
                max={creditBalance?.availableCredits}
                step="100"
                value={budgetCredits}
                onChange={(event) => {
                  const requested = Math.max(0, Number(event.target.value));
                  setBudgetCredits(
                    creditBalance
                      ? Math.min(creditBalance.availableCredits, requested)
                      : requested,
                  );
                }}
              />
              <small>{creditBalance ? `${creditBalance.availableCredits.toLocaleString()} Campaign Credits available. The selected budget is reserved when submitted.` : "Your Campaign Credits balance could not be loaded. You can edit the form, but submission will wait for an authoritative balance check."}</small>
            </label>
            <div className="owner-exposure-card">
              <span>
                <Users />
              </span>
              <small>Potential exposure</small>
              <strong>
                {exposure.minimum.toLocaleString()}–{exposure.maximum.toLocaleString()} players
              </strong>
              <p>A broad estimate based on the credit budget, reward configuration, milestones, and current server activity. Actual exposure could be lower or higher.</p>
            </div>
            <div className="owner-campaign-summary">
              <div>
                <span>Campaign</span>
                <strong>{campaignTitle || "Untitled"}</strong>
              </div>
              <div>
                <span>Milestones</span>
                <strong>{milestones.length} automatic</strong>
              </div>
              <div>
                <span>Campaign budget</span>
                <strong>{budgetCredits.toLocaleString()} Credits</strong>
              </div>
              <div>
                <span>Potential Sparks</span>
                <strong>
                  {minimumSparks}–{maximumSparks}
                </strong>
              </div>
              <div>
                <span>Potential exposure</span>
                <strong>
                  {exposure.minimum.toLocaleString()}–{exposure.maximum.toLocaleString()}
                </strong>
              </div>
              <div>
                <span>Planning estimate</span>
                <strong>Up to {derivedCapacity.toLocaleString()} eligible joins · ~{estimatedCreditCost} Credits each</strong>
              </div>
            </div>
            <div className="owner-builder-preview">
              <Eye />
              <span>
                <strong>Player-facing language</strong>
                <small>
                  Eligible activity may receive {minimumSparks}–{maximumSparks} Sparks after automatic verification.
                </small>
              </span>
            </div>
            {builderMessage && (
              <div className="owner-team-message" role="status">
                {builderMessage}
              </div>
            )}
            <button className="button button--primary owner-submit-campaign" disabled={saving || saved || !eligibility?.eligible} onClick={submitCampaign}>
              {saved ? "Submitted for review" : saving ? "Submitting…" : "Review and submit"}
            </button>
          </section>
          <p className="owner-policy-footnote">
            <ShieldCheck /> Nortix may hold unusual activity for moderator review even when a milestone normally verifies automatically.
          </p>
        </aside>
      </div>
    </div>
  );
}

function RegisterServer({ server, setServer }: { server: ServerRecord | null; setServer: (server: ServerRecord) => void }) {
  type Challenge = {
    serverId: string;
    code: string;
    platform: "PAPER" | "VELOCITY";
    networkScope: "SERVER" | "PROXY_NETWORK";
    expiresAt: string;
    motdText: string;
    downstreamVerificationRequired: boolean;
  };
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  type RegistrationPlatform = "PAPER" | "VELOCITY" | "DOWNSTREAM";
  const [platform, setPlatform] = useState<RegistrationPlatform>("PAPER");
  const [verifiedProxies, setVerifiedProxies] = useState<Array<{ id: string; name: string; hostname: string }>>([]);
  const [verificationParentId, setVerificationParentId] = useState("");
  const [inheritedComplete, setInheritedComplete] = useState(false);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [status, setStatus] = useState<"DETAILS" | "PENDING" | "CHECKING" | "VERIFIED">("DETAILS");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    void api<
      Array<{
        id: string;
        name: string;
        hostname: string;
        verificationScope: string;
        verificationStatus: string;
      }>
    >("/owner/servers")
      .then((items) => {
        const proxies = items.filter((item) => item.verificationScope === "PROXY_NETWORK" && item.verificationStatus === "VERIFIED");
        setVerifiedProxies(proxies);
        if (proxies[0]) setVerificationParentId(proxies[0].id);
      })
      .catch(() => undefined);
  }, []);

  const parseAddress = () => {
    const value = address.trim().replace(/^minecraft:\/\//i, "");
    const match = value.match(/^\[([^\]]+)\](?::(\d+))?$/);
    if (match) return { hostname: match[1]!, port: Number(match[2] ?? 25565) };
    const lastColon = value.lastIndexOf(":");
    if (lastColon > -1 && value.indexOf(":") === lastColon) {
      const port = Number(value.slice(lastColon + 1));
      if (Number.isInteger(port)) return { hostname: value.slice(0, lastColon), port };
    }
    return { hostname: value, port: 25565 };
  };

  const beginVerification = async () => {
    setError("");
    try {
      const target = parseAddress();
      const created = await api<{ id: string }>("/servers", {
        method: "POST",
        body: JSON.stringify({
          name,
          hostname: target.hostname,
          port: target.port,
          description: `${name} is a Minecraft server registered through the Nortix owner portal.`,
          edition: "JAVA",
          versions: ["1.16+"],
          categories: [platform === "VELOCITY" ? "Network" : "Minecraft"],
          tags: [platform.toLowerCase()],
          ...(platform === "DOWNSTREAM" ? { verificationParentId } : {}),
        }),
      });
      if (platform === "DOWNSTREAM") {
        setInheritedComplete(true);
        setStatus("VERIFIED");
        return;
      }
      const next = await api<Challenge>(`/servers/${created.id}/verification`, {
        method: "POST",
        body: JSON.stringify({ platform }),
      });
      setChallenge(next);
      setStatus("PENDING");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Registration could not be started.");
    }
  };

  const checkVerification = async (quiet = false) => {
    if (!challenge || status === "VERIFIED") return;
    if (!quiet) setStatus("CHECKING");
    try {
      await api(`/servers/${challenge.serverId}/verification/check`, { method: "POST" });
      setStatus("VERIFIED");
    } catch (reason) {
      if (!quiet) {
        setError(reason instanceof Error ? reason.message : "The code is not visible yet.");
        setStatus("PENDING");
      }
    }
  };

  useEffect(() => {
    if (!challenge || status === "VERIFIED") return;
    const timer = window.setInterval(() => void checkVerification(true), 6_000);
    return () => window.clearInterval(timer);
  }, [challenge, status]);

  const copyCode = async () => {
    if (!challenge) return;
    await navigator.clipboard.writeText(challenge.code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1_500);
  };

  return (
    <div className="dashboard-page owner-platform">
      {server ? (
        <OwnerHeader
          eyebrow="SERVER REGISTRATION"
          title="Verify your Minecraft server"
          description="Prove control with a short-lived code in the public MOTD. Nortix reads the code through the normal Minecraft server-list ping."
          server={server}
          setServer={setServer}
          action={
            <Link className="button button--secondary" to="/owner/integrations">
              Back to registry
            </Link>
          }
        />
      ) : (
        <div className="owner-page-header">
          <div>
            <span className="eyebrow">SERVER REGISTRATION</span>
            <h1>Bring your server to Nortix</h1>
            <p>Registration is free. Verify ownership once, connect the plugin, and start building a trusted activity history.</p>
          </div>
          <Link className="button button--secondary" to="/owner">Back</Link>
        </div>
      )}
      <div className="owner-register-grid">
        <section className="card owner-builder-form">
          {inheritedComplete ? (
            <div className="owner-verification">
              <header>
                <span>REGISTRATION COMPLETE</span>
                <h2>Backend server linked</h2>
                <p>This entry inherits ownership from your verified public proxy and does not need its own MOTD code.</p>
              </header>
              <div className="owner-verification-success">
                <CheckCircle2 />
                <div>
                  <strong>Covered by the proxy network claim</strong>
                  <p>The backend may stay private. If it later becomes a separate public entry point, register and verify that address independently.</p>
                </div>
              </div>
            </div>
          ) : !challenge ? (
            <>
              <header>
                <span>STEP 1 OF 2</span>
                <h2>Choose what players connect to</h2>
                <p>Register a standalone Paper server or the public Velocity proxy for a network.</p>
              </header>
              <div className="owner-platform-choice">
                <button className={platform === "PAPER" ? "selected" : ""} onClick={() => setPlatform("PAPER")}>
                  <Server />
                  <span>
                    <strong>Paper server</strong>
                    <small>Verify this standalone server. Compatible with Paper from Minecraft 1.16 onward.</small>
                  </span>
                  <CheckCircle2 />
                </button>
                <button className={platform === "VELOCITY" ? "selected" : ""} onClick={() => setPlatform("VELOCITY")}>
                  <Network />
                  <span>
                    <strong>Velocity proxy</strong>
                    <small>Verify the public proxy once. Backend servers behind it do not need separate claims.</small>
                  </span>
                  <CheckCircle2 />
                </button>
                <button className={platform === "DOWNSTREAM" ? "selected" : ""} disabled={verifiedProxies.length === 0} onClick={() => setPlatform("DOWNSTREAM")}>
                  <Link2 />
                  <span>
                    <strong>Backend behind proxy</strong>
                    <small>{verifiedProxies.length ? "Link this server to an already verified proxy without another public MOTD check." : "Verify a Velocity proxy first to enable inherited registration."}</small>
                  </span>
                  <CheckCircle2 />
                </button>
              </div>
              <div className="form-grid form-grid--two owner-register-fields">
                <label>
                  Display name
                  <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Example Network" />
                </label>
                <label>
                  {platform === "DOWNSTREAM" ? "Backend address" : "Public address"}
                  <input value={address} onChange={(event) => setAddress(event.target.value)} placeholder={platform === "DOWNSTREAM" ? "survival.internal:25565" : "play.example.net:25565"} />
                </label>
                {platform === "DOWNSTREAM" && (
                  <label className="span-two">
                    Verified proxy
                    <select value={verificationParentId} onChange={(event) => setVerificationParentId(event.target.value)}>
                      {verifiedProxies.map((proxy) => (
                        <option key={proxy.id} value={proxy.id}>
                          {proxy.name} · {proxy.hostname}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
              {error && <p className="owner-verification-error">{error}</p>}
              <button className="button button--primary" disabled={name.trim().length < 3 || address.trim().length < 3 || (platform === "DOWNSTREAM" && !verificationParentId)} onClick={() => void beginVerification()}>
                <Link2 />
                {platform === "DOWNSTREAM" ? "Link backend server" : "Generate verification code"}
              </button>
            </>
          ) : (
            <div className="owner-verification">
              <header>
                <span>STEP 2 OF 2</span>
                <h2>{status === "VERIFIED" ? "Server verified" : "Publish the code in your MOTD"}</h2>
                <p>{status === "VERIFIED" ? "Ownership is confirmed. The code may now be removed automatically or manually." : "This code expires after 15 minutes. Keep the server reachable from the public internet while Nortix checks it."}</p>
              </header>
              {status === "VERIFIED" ? (
                <div className="owner-verification-success">
                  <CheckCircle2 />
                  <div>
                    <strong>{platform === "VELOCITY" ? "Proxy network claimed" : "Paper server claimed"}</strong>
                    <p>{platform === "VELOCITY" ? "This claim covers the public proxy. Its registered backend servers inherit the network claim and do not need to expose their own MOTDs." : "This standalone server is now linked to your owner account."}</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="owner-verification-code">
                    <small>ONE-TIME MOTD CODE</small>
                    <code>{challenge.code}</code>
                    <button onClick={() => void copyCode()}>
                      <Copy />
                      {copied ? "Copied" : "Copy code"}
                    </button>
                    <span>
                      Expires{" "}
                      {new Date(challenge.expiresAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div className="owner-verification-methods">
                    <article>
                      <b>Plugin method</b>
                      <p>Install the {platform === "VELOCITY" ? "Nortix Velocity" : "Nortix Paper"} plugin, then run:</p>
                      <code>
                        {platform === "VELOCITY" ? "/nortixproxy" : "/nortix"} verify {challenge.code}
                      </code>
                      <small>The plugin temporarily appends the code to the ping MOTD and contacts the Nortix backend.</small>
                    </article>
                    <article>
                      <b>Manual fallback</b>
                      <p>Add this exact token anywhere in the public MOTD:</p>
                      <code>[{challenge.code}]</code>
                      <small>Reload or restart the server so the public server-list ping returns it.</small>
                    </article>
                  </div>
                  {error && <p className="owner-verification-error">{error}</p>}
                  <div className="owner-verification-actions">
                    <button
                      onClick={() => {
                        setChallenge(null);
                        setStatus("DETAILS");
                        setError("");
                      }}
                    >
                      Start over
                    </button>
                    <button className="button button--primary" disabled={status === "CHECKING"} onClick={() => void checkVerification()}>
                      <RefreshCw />
                      {status === "CHECKING" ? "Checking public MOTD..." : "Check verification"}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </section>
        <aside className="card owner-registration-checklist">
          <h2>How ownership proof works</h2>
          {[
            ["Enter the public address", "Nortix creates a short-lived code for that exact host and port."],
            ["Publish the code", "The plugin can add it to ping responses, or you may edit the MOTD yourself."],
            ["Independent check", "The backend connects like a server-list client and reads the public MOTD."],
            ["Claim recorded", "A matching code links the server to this signed-in owner account."],
            ["Proxy-aware scope", "A verified Velocity entry covers its network; private backend servers are not each verified."],
          ].map(([title, note], index) => (
            <div key={title}>
              <b>{index + 1}</b>
              <span>
                <strong>{title}</strong>
                <small>{note}</small>
              </span>
            </div>
          ))}
          <p className="owner-security-note">
            <LockKeyhole /> Plugin callbacks alone never claim a server. Nortix must independently observe the one-time code.
          </p>
        </aside>
      </div>
    </div>
  );
}
