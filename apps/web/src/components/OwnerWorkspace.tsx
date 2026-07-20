import {
  ArrowUpRight,
  Bell,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleDot,
  Clock3,
  Copy,
  Database,
  Download,
  Eye,
  Filter,
  Gauge,
  Globe2,
  KeyRound,
  Link2,
  LockKeyhole,
  MessageSquareText,
  MoreHorizontal,
  Network,
  Pause,
  Plug,
  Plus,
  Radio,
  RefreshCw,
  Save,
  Search,
  Server,
  Settings,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserPlus,
  Users,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";

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
};

const registeredServers: ServerRecord[] = [
  {
    id: "skyblock-x",
    name: "Skyblock X",
    address: "play.skyblockx.net",
    status: "Live",
    players: 1243,
    version: "1.20.4",
    plugin: "v2.8.1",
    heartbeat: "18s ago",
    events: "184K",
    discovery: true,
  },
  {
    id: "prison-craft",
    name: "PrisonCraft",
    address: "mc.prisoncraft.gg",
    status: "Live",
    players: 982,
    version: "1.20.2",
    plugin: "v2.8.1",
    heartbeat: "31s ago",
    events: "126K",
    discovery: true,
  },
  {
    id: "factions-legacy",
    name: "Factions Legacy",
    address: "play.factionslegacy.io",
    status: "Attention",
    players: 654,
    version: "1.20.4",
    plugin: "v2.7.4",
    heartbeat: "9m ago",
    events: "72K",
    discovery: false,
  },
];

const trendBars = [42, 48, 44, 58, 64, 61, 74, 71, 83, 78, 91, 88, 96, 92];
const retentionBars = [100, 72, 58, 49, 43, 39, 36];

function StatusDot({ status }: { status: ServerRecord["status"] }) {
  return <i className={`owner-status owner-status--${status.toLowerCase()}`}>{status}</i>;
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      className={`owner-toggle ${checked ? "is-on" : ""}`}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
    >
      <span />
    </button>
  );
}

function OwnerHeader({
  eyebrow,
  title,
  description,
  server,
  setServer,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  server: ServerRecord;
  setServer: (server: ServerRecord) => void;
  action?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
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
                {registeredServers.map((item) => (
                  <button
                    className={item.id === server.id ? "active" : ""}
                    key={item.id}
                    onClick={() => {
                      setServer(item);
                      setOpen(false);
                    }}
                  >
                    <span className="owner-server-mark">{item.name.slice(0, 2).toUpperCase()}</span>
                    <span><strong>{item.name}</strong><small>{item.address}</small></span>
                    <StatusDot status={item.status} />
                  </button>
                ))}
                <Link to="/owner/servers/new"><Plus /> Register another server</Link>
              </div>
            )}
          </div>
          {action}
        </div>
      </div>
      <div className="owner-context-strip">
        <span><CircleDot /> {server.players.toLocaleString()} online now</span>
        <span><Plug /> Plugin {server.plugin}</span>
        <span><Radio /> Last signal {server.heartbeat}</span>
        <span><Database /> {server.events} events this month</span>
        <StatusDot status={server.status} />
      </div>
    </>
  );
}

export function OwnerPlatform() {
  const location = useLocation();
  const [server, setServer] = useState(registeredServers[0]!);
  const path = location.pathname;

  if (path.includes("campaigns/new")) return <CampaignBuilder server={server} setServer={setServer} />;
  if (path.includes("servers/new")) return <RegisterServer server={server} setServer={setServer} />;
  if (path.includes("analytics")) return <OwnerAnalytics server={server} setServer={setServer} />;
  if (path.includes("integrations")) return <PluginServers server={server} setServer={setServer} />;
  if (path.includes("balance")) return <OwnerSparks server={server} setServer={setServer} />;
  if (path.includes("settings")) return <OwnerSettings server={server} setServer={setServer} />;
  return <OwnerDashboard server={server} setServer={setServer} />;
}

function OwnerDashboard({
  server,
  setServer,
}: {
  server: ServerRecord;
  setServer: (server: ServerRecord) => void;
}) {
  const [range, setRange] = useState("30 days");
  const [exported, setExported] = useState(false);
  return (
    <div className="dashboard-page owner-platform">
      <OwnerHeader
        eyebrow="SERVER OWNER · PORTFOLIO OVERVIEW"
        title="Your player intelligence center"
        description="See how players discover, join, experience, and return to your servers—then turn those signals into better product decisions."
        server={server}
        setServer={setServer}
        action={<Link className="button button--primary" to="/owner/campaigns/new"><Plus /> New campaign</Link>}
      />

      <div className="owner-toolbar">
        <span><strong>Portfolio:</strong> 3 registered servers · 2 live · 1 needs attention</span>
        <label><Clock3 /><select value={range} onChange={(event) => setRange(event.target.value)}><option>7 days</option><option>30 days</option><option>90 days</option></select></label>
        <button onClick={() => setExported(true)}><Download /> {exported ? "Export prepared" : "Export report"}</button>
      </div>

      <div className="owner-kpi-grid">
        {[
          { icon: Eye, label: "Discovery impressions", value: "128.4K", delta: "+18.2%", note: "vs previous period", positive: true },
          { icon: UserPlus, label: "Qualified server joins", value: "9,842", delta: "+11.7%", note: "7.7% impression conversion", positive: true },
          { icon: Users, label: "Unique active players", value: "6,218", delta: "+8.4%", note: "3,104 returning players", positive: true },
          { icon: TrendingUp, label: "7-day return rate", value: "38.6%", delta: "+4.1 pts", note: "Top 24% of similar servers", positive: true },
          { icon: MessageSquareText, label: "Useful responses", value: "842", delta: "91%", note: "marked specific by reviewers", positive: true },
          { icon: Sparkles, label: "Potential Sparks exposure", value: "Up to 8.4K", delta: "64%", note: "of configured monthly limit", positive: false },
        ].map(({ icon: Icon, label, value, delta, note, positive }) => (
          <article className="card owner-kpi" key={label}>
            <header><span><Icon /></span><small>{label}</small><MoreHorizontal /></header>
            <strong>{value}</strong>
            <p className={positive ? "positive" : ""}>{positive ? <ArrowUpRight /> : <Gauge />}{delta} <span>{note}</span></p>
          </article>
        ))}
      </div>

      <div className="owner-dashboard-grid">
        <section className="card owner-trend-card">
          <div className="owner-card-heading">
            <div><h2>Player demand & conversion</h2><p>Daily qualified discovery traffic and resulting joins for {server.name}.</p></div>
            <span className="owner-legend"><i /> Impressions <i /> Joins</span>
          </div>
          <div className="owner-chart-summary">
            <span><small>Total qualified visits</small><strong>48,290</strong><em>+16.8%</em></span>
            <span><small>Resulting joins</small><strong>3,714</strong><em>7.69% conversion</em></span>
          </div>
          <div className="owner-bar-chart" aria-label="Discovery and join trend">
            {trendBars.map((height, index) => <i style={{ height: `${height}%` }} key={index}><b style={{ height: `${Math.max(18, height * .34)}%` }} /></i>)}
          </div>
          <div className="owner-chart-axis"><span>Jun 21</span><span>Jun 28</span><span>Jul 5</span><span>Jul 12</span><span>Today</span></div>
        </section>

        <section className="card owner-funnel-card">
          <div className="owner-card-heading"><div><h2>Acquisition funnel</h2><p>Where potential players stop or continue.</p></div><Filter /></div>
          {[
            ["Discovery impressions", "48,290", "100%", 100],
            ["Server profile views", "18,604", "38.5%", 78],
            ["Connection intent", "7,821", "16.2%", 55],
            ["Verified first join", "3,714", "7.7%", 38],
            ["Active after 7 days", "1,434", "3.0%", 24],
          ].map(([label, value, rate, width]) => (
            <div className="owner-funnel-row" key={label}>
              <span><strong>{label}</strong><small>{rate} of impressions</small></span>
              <div><i style={{ width: `${width}%` }} /></div>
              <b>{value}</b>
            </div>
          ))}
          <Link to="/owner/analytics">Open conversion analysis <ArrowUpRight /></Link>
        </section>
      </div>

      <div className="owner-dashboard-grid owner-dashboard-grid--lower">
        <section className="card">
          <div className="owner-card-heading"><div><h2>Campaign performance</h2><p>Signals from active and recently completed research campaigns.</p></div><Link to="/owner/campaigns/new">Create campaign</Link></div>
          <div className="owner-table-wrap">
            <table className="owner-table">
              <thead><tr><th>Campaign</th><th>Status</th><th>Participants</th><th>Completion</th><th>Useful feedback</th><th>Sparks limit</th><th /></tr></thead>
              <tbody>
                {[
                  ["First island experience", "ACTIVE", "418 / 500", "78.2%", "92%", "Up to 100"],
                  ["Tutorial clarity study", "ACTIVE", "241 / 300", "83.6%", "89%", "Up to 75"],
                  ["Returning player check-in", "DRAFT", "—", "—", "—", "Up to 50"],
                  ["Spawn navigation study", "COMPLETED", "600 / 600", "72.4%", "94%", "Up to 65"],
                ].map((row) => (
                  <tr key={row[0]}>{row.map((cell, index) => <td key={`${row[0]}-${index}`}>{index === 0 ? <strong>{cell}</strong> : cell}</td>)}<td><button><MoreHorizontal /></button></td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="card owner-insight-card">
          <header><span><Zap /></span><div><h2>Nortix Insight</h2><p>Generated from 842 recent responses.</p></div></header>
          <strong>Players who finish the island tutorial are 2.4× more likely to return within seven days.</strong>
          <p>The largest drop-off appears between selecting an island and finding the first objective. Mobile Bedrock players mention navigation clarity 31% more often.</p>
          <div><span>Confidence <b>High</b></span><span>Sample <b>1,284 players</b></span></div>
          <button>Open supporting data <ArrowUpRight /></button>
        </aside>
      </div>

      <section className="owner-portfolio-section">
        <div className="owner-card-heading"><div><h2>Registered server portfolio</h2><p>Connection health and topline demand across every server on this owner account.</p></div><Link to="/owner/integrations">Manage servers</Link></div>
        <div className="owner-server-cards">
          {registeredServers.map((item) => (
            <article className="card" key={item.id}>
              <header><span className="owner-server-mark">{item.name.slice(0, 2).toUpperCase()}</span><div><strong>{item.name}</strong><small>{item.address}</small></div><StatusDot status={item.status} /></header>
              <div><span><small>Online</small><strong>{item.players.toLocaleString()}</strong></span><span><small>30d joins</small><strong>{item.id === "skyblock-x" ? "3,714" : item.id === "prison-craft" ? "2,906" : "1,842"}</strong></span><span><small>7d return</small><strong>{item.id === "skyblock-x" ? "38.6%" : item.id === "prison-craft" ? "34.2%" : "29.8%"}</strong></span></div>
              <button onClick={() => setServer(item)}>View server data <ArrowUpRight /></button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function OwnerAnalytics({
  server,
  setServer,
}: {
  server: ServerRecord;
  setServer: (server: ServerRecord) => void;
}) {
  const [tab, setTab] = useState("Overview");
  const [range, setRange] = useState("Last 30 days");
  return (
    <div className="dashboard-page owner-platform">
      <OwnerHeader
        eyebrow="PLAYER INTELLIGENCE"
        title="Analytics"
        description="Understand acquisition, activation, retention, player sentiment, and the experiences most likely to influence long-term server health."
        server={server}
        setServer={setServer}
        action={<button className="button button--secondary"><Download /> Export dataset</button>}
      />
      <div className="owner-analytics-nav">
        <div>{["Overview", "Acquisition", "Retention", "Experience", "Feedback"].map((item) => <button className={tab === item ? "active" : ""} onClick={() => setTab(item)} key={item}>{item}</button>)}</div>
        <label><Clock3 /><select value={range} onChange={(event) => setRange(event.target.value)}><option>Last 7 days</option><option>Last 30 days</option><option>Last 90 days</option><option>Season to date</option></select></label>
      </div>

      <div className="owner-kpi-grid owner-kpi-grid--analytics">
        {[
          ["Qualified joins", "3,714", "+16.8%", "vs prior period"],
          ["Activation rate", "61.4%", "+5.2 pts", "finished first objective"],
          ["Median session", "47m 18s", "+6m 12s", "among new players"],
          ["D7 retention", "38.6%", "+4.1 pts", "1,434 retained players"],
          ["Player sentiment", "4.6 / 5", "+0.3", "842 useful responses"],
        ].map(([label, value, delta, note]) => <article className="card owner-kpi" key={label}><small>{label}</small><strong>{value}</strong><p className="positive"><ArrowUpRight />{delta} <span>{note}</span></p></article>)}
      </div>

      <div className="owner-dashboard-grid">
        <section className="card owner-trend-card">
          <div className="owner-card-heading"><div><h2>{tab} trend</h2><p>Comparable, privacy-conscious player signals across the selected period.</p></div><span className="owner-quality-chip"><ShieldCheck /> 96% data quality</span></div>
          <div className="owner-dual-trend" aria-label="Primary and comparison analytics trend">
            {trendBars.map((height, index) => (
              <i style={{ height: `${height}%` }} key={index}>
                <b style={{ height: `${Math.max(14, height * .62)}%` }} />
              </i>
            ))}
          </div>
          <div className="owner-chart-axis"><span>Jun 21</span><span>Jun 28</span><span>Jul 5</span><span>Jul 12</span><span>Today</span></div>
        </section>
        <section className="card">
          <div className="owner-card-heading"><div><h2>Player segments</h2><p>How this period’s active audience is composed.</p></div><Users /></div>
          <div className="owner-segment-donut">
            <div><span>6,218<small>active players</small></span></div>
            <ul>
              <li><i /> New this period <b>42%</b></li>
              <li><i /> Returning regulars <b>31%</b></li>
              <li><i /> Re-engaged <b>17%</b></li>
              <li><i /> At risk <b>10%</b></li>
            </ul>
          </div>
          <button className="owner-text-button">Build a segment <ArrowUpRight /></button>
        </section>
      </div>

      <div className="owner-analytics-panels">
        <section className="card">
          <div className="owner-card-heading"><div><h2>Retention curve</h2><p>Share of a new-player cohort returning after its first session.</p></div><TrendingUp /></div>
          <div className="retention-chart">{retentionBars.map((height, index) => <div key={index}><i style={{ height: `${height}%` }} /><span>{index === 0 ? "Day 0" : `Day ${index}`}</span><b>{height}%</b></div>)}</div>
          <div className="owner-benchmark"><CheckCircle2 /><span><strong>Above category benchmark</strong><small>Your Day 7 retention is 6.8 points above similar Economy servers.</small></span></div>
        </section>
        <section className="card">
          <div className="owner-card-heading"><div><h2>Acquisition sources</h2><p>Qualified joins attributed to the last meaningful source.</p></div><Network /></div>
          {[
            ["Nortix discovery", "1,604", "43.2%", 86],
            ["Direct / saved server", "912", "24.6%", 62],
            ["Friend or referral", "681", "18.3%", 47],
            ["Campaign participation", "332", "8.9%", 29],
            ["Other", "185", "5.0%", 18],
          ].map(([label, value, percent, width]) => <div className="owner-source-row" key={label}><span><strong>{label}</strong><small>{value} joins</small></span><div><i style={{ width: `${width}%` }} /></div><b>{percent}</b></div>)}
        </section>
        <section className="card">
          <div className="owner-card-heading"><div><h2>Experience signals</h2><p>Where feedback and behavior point in the same direction.</p></div><MessageSquareText /></div>
          {[
            ["Tutorial clarity", "Strong", "+12% activation", "positive"],
            ["Spawn navigation", "Needs work", "18% early exits", "warning"],
            ["Economy pacing", "Mixed", "Wide cohort variance", "neutral"],
            ["Community welcome", "Strong", "+9% D7 retention", "positive"],
          ].map(([label, signal, impact, tone]) => <div className="owner-experience-row" key={label}><span><strong>{label}</strong><small>{impact}</small></span><i className={tone}>{signal}</i></div>)}
        </section>
      </div>

      <section className="card">
        <div className="owner-card-heading"><div><h2>Cohort explorer</h2><p>Compare how audience, version, source, and first-session behavior relate to return outcomes.</p></div><button><Filter /> Edit dimensions</button></div>
        <div className="owner-table-wrap">
          <table className="owner-table">
            <thead><tr><th>Cohort</th><th>Players</th><th>Activated</th><th>Median session</th><th>Day 1</th><th>Day 7</th><th>Day 30</th><th>Sentiment</th></tr></thead>
            <tbody>
              {[
                ["Java · Nortix discovery", "1,842", "68.2%", "52m", "56.4%", "42.8%", "24.1%", "4.7"],
                ["Bedrock · Nortix discovery", "1,104", "54.7%", "39m", "47.1%", "31.6%", "17.8%", "4.2"],
                ["Java · Friend referral", "918", "72.1%", "58m", "61.8%", "48.3%", "29.4%", "4.8"],
                ["Returning after 30d+", "642", "63.9%", "49m", "52.2%", "39.7%", "22.6%", "4.5"],
              ].map((row) => <tr key={row[0]}>{row.map((cell, index) => <td key={`${row[0]}-${index}`}>{index === 0 ? <strong>{cell}</strong> : cell}</td>)}</tr>)}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function PluginServers({
  server,
  setServer,
}: {
  server: ServerRecord;
  setServer: (server: ServerRecord) => void;
}) {
  const [servers, setServers] = useState(registeredServers);
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState("");
  const filtered = useMemo(() => servers.filter((item) => `${item.name} ${item.address} ${item.status}`.toLowerCase().includes(query.toLowerCase())), [query, servers]);
  const togglePause = (id: string) => setServers((items) => items.map((item) => item.id === id ? { ...item, status: item.status === "Paused" ? "Live" : "Paused" } : item));

  return (
    <div className="dashboard-page owner-platform">
      <OwnerHeader
        eyebrow="PLUGIN & SERVER REGISTRY"
        title="Connected servers"
        description="One owner account can register multiple Minecraft servers. Monitor plugin health, event collection, configuration, and discovery readiness from one place."
        server={server}
        setServer={setServer}
        action={<Link className="button button--primary" to="/owner/servers/new"><Plus /> Register server</Link>}
      />
      <div className="owner-plugin-summary">
        <article className="card"><span><Server /></span><div><small>Registered servers</small><strong>{servers.length}</strong><p>2 healthy · 1 needs attention</p></div></article>
        <article className="card"><span><Radio /></span><div><small>Events received today</small><strong>18.4K</strong><p className="positive">+12% vs daily average</p></div></article>
        <article className="card"><span><Gauge /></span><div><small>Collection success</small><strong>99.82%</strong><p>34 events retried automatically</p></div></article>
        <article className="card"><span><ShieldCheck /></span><div><small>Data health</small><strong>Good</strong><p>1 plugin update recommended</p></div></article>
      </div>

      <section className="card owner-server-registry">
        <div className="owner-card-heading">
          <div><h2>Active server registry</h2><p>Servers linked to this owner account and authorized to send privacy-conscious gameplay events.</p></div>
          <label className="owner-registry-search"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search servers..." /></label>
        </div>
        {filtered.map((item) => (
          <article className="owner-registry-row" key={item.id}>
            <button className="owner-server-mark" onClick={() => setServer(item)}>{item.name.slice(0, 2).toUpperCase()}</button>
            <div className="owner-registry-row__identity"><strong>{item.name}</strong><span>{item.address} · Minecraft {item.version}</span><StatusDot status={item.status} /></div>
            <div><small>Plugin</small><strong>{item.plugin}</strong><span>{item.id === "factions-legacy" ? "Update available" : "Current"}</span></div>
            <div><small>Last heartbeat</small><strong>{item.heartbeat}</strong><span>{item.status === "Attention" ? "Delayed" : "Normal"}</span></div>
            <div><small>Events this month</small><strong>{item.events}</strong><span>{item.id === "skyblock-x" ? "99.9% accepted" : "99.7% accepted"}</span></div>
            <div className="owner-registry-actions">
              <button onClick={() => togglePause(item.id)}>{item.status === "Paused" ? <RefreshCw /> : <Pause />}{item.status === "Paused" ? "Resume" : "Pause"}</button>
              <button><Settings /> Configure</button>
              <button aria-label={`More actions for ${item.name}`}><MoreHorizontal /></button>
            </div>
          </article>
        ))}
      </section>

      <div className="owner-dashboard-grid">
        <section className="card owner-plugin-install">
          <div className="owner-card-heading"><div><h2>Plugin installation</h2><p>Connect a Paper, Spigot, or compatible proxy server in a few minutes.</p></div><Plug /></div>
          <ol>
            <li><b>1</b><span><strong>Download Nortix Plugin</strong><small>Compatible with Paper and Spigot 1.19–1.21.</small></span><button><Download /> Download .jar</button></li>
            <li><b>2</b><span><strong>Add the server key</strong><small>Place this key in plugins/Nortix/config.yml.</small></span><code>ntx_live_skx_••••••••7h2k</code><button onClick={() => setCopied("key")}><Copy />{copied === "key" ? "Copied" : "Copy"}</button></li>
            <li><b>3</b><span><strong>Restart and verify</strong><small>Nortix checks signed heartbeats and validates supported events.</small></span><button><RefreshCw /> Verify connection</button></li>
          </ol>
          <p className="owner-security-note"><LockKeyhole /> Server keys can be rotated independently. A key may only send events for its assigned server.</p>
        </section>
        <section className="card">
          <div className="owner-card-heading"><div><h2>Live event stream</h2><p>Recent accepted plugin signals.</p></div><span className="live-pill">LIVE</span></div>
          <div className="owner-event-stream">
            {[
              ["18:42:09", "player_objective", "Skyblock X", "accepted"],
              ["18:42:07", "session_heartbeat", "PrisonCraft", "accepted"],
              ["18:41:58", "tutorial_complete", "Skyblock X", "accepted"],
              ["18:41:52", "server_heartbeat", "Factions Legacy", "delayed"],
              ["18:41:46", "player_disconnect", "PrisonCraft", "accepted"],
            ].map(([time, event, source, state]) => <div key={`${time}-${event}`}><code>{time}</code><span><strong>{event}</strong><small>{source}</small></span><i className={state}>{state}</i></div>)}
          </div>
          <button className="owner-text-button">Open event diagnostics <ArrowUpRight /></button>
        </section>
      </div>
    </div>
  );
}

function OwnerSettings({
  server,
  setServer,
}: {
  server: ServerRecord;
  setServer: (server: ServerRecord) => void;
}) {
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

  const groups = ["Discovery", "Sparks", "Notifications", "Data & privacy", "Team access", "Security"];
  return (
    <div className="dashboard-page owner-platform">
      <OwnerHeader eyebrow="OWNER CONFIGURATION" title="Settings" description="Control how each server appears, how Sparks features behave, what data is collected, and who receives operational updates." server={server} setServer={setServer} action={<button className="button button--primary" onClick={() => setSaved(true)}><Save />{saved ? "Changes saved" : "Save changes"}</button>} />
      <div className="owner-settings-layout">
        <nav>{groups.map((item) => <button className={section === item ? "active" : ""} onClick={() => setSection(item)} key={item}>{item === "Discovery" ? <Globe2 /> : item === "Sparks" ? <Sparkles /> : item === "Notifications" ? <Bell /> : item === "Data & privacy" ? <Database /> : item === "Team access" ? <Users /> : <KeyRound />}{item}</button>)}</nav>
        <main>
          {section === "Discovery" && (
            <>
              <SettingsHeading icon={Globe2} title="Discovery visibility" description={`Control whether ${server.name} can appear in Nortix browsing, search, and recommendations.`} />
              <SettingRow title="Enable server discovery" description="Allow this server to appear in Nortix discovery surfaces. Disabling it does not remove historical analytics." checked={discovery} onChange={setDiscovery} />
              <SettingRow title="Appear in search results" description="Let players find this server by name, category, edition, and supported version." checked={searchListing} onChange={setSearchListing} disabled={!discovery} />
              <SettingRow title="Personalized recommendations" description="Allow Nortix to recommend this server when player preferences and server characteristics may align." checked={discovery && searchListing} onChange={setSearchListing} disabled={!discovery} />
              <div className="owner-setting-note"><Eye /><span><strong>Current visibility preview</strong><p>{discovery ? `${server.name} may appear in discovery, search, and eligible recommendation modules.` : `${server.name} is hidden from discovery. Direct server links and owner analytics remain available.`}</p></span></div>
            </>
          )}
          {section === "Sparks" && (
            <>
              <SettingsHeading icon={Sparkles} title="Sparks controls" description="Choose which optional Sparks features are available for this server and its campaigns." />
              <SettingRow title="Allow players to potentially earn Sparks" description="Eligible, verified campaign activity may provide Sparks up to the published limit." checked={earnSparks} onChange={setEarnSparks} />
              <SettingRow title="Allow Sparks spending features" description="Enable eligible server-linked cosmetics, boosts, or optional experiences that use Sparks." checked={spendSparks} onChange={setSpendSparks} />
              <SettingRow title="Sparks activity notifications" description="Notify owners about limit thresholds, unusual activity, and completed verification batches." checked={sparksAlerts} onChange={setSparksAlerts} />
              <label className="owner-setting-field"><span><strong>Default campaign limit</strong><small>New campaigns may use this upper limit unless changed before submission.</small></span><select defaultValue="75"><option value="25">Up to 25 Sparks</option><option value="50">Up to 50 Sparks</option><option value="75">Up to 75 Sparks</option><option value="100">Up to 100 Sparks</option></select></label>
              <label className="owner-setting-field"><span><strong>Monthly exposure alert</strong><small>Send an alert when configured potential Sparks reach this share of your monthly limit.</small></span><select defaultValue="80"><option>60%</option><option>70%</option><option>80%</option><option>90%</option></select></label>
            </>
          )}
          {section === "Notifications" && (
            <>
              <SettingsHeading icon={Bell} title="Owner notifications" description="Decide which operational and research updates reach your team." />
              <SettingRow title="Campaign activity" description="New submissions, verification queues, moderation decisions, and campaign limits." checked={campaignAlerts} onChange={setCampaignAlerts} />
              <SettingRow title="Weekly intelligence digest" description="A concise summary of acquisition, retention, sentiment, and emerging feedback themes." checked={weeklyDigest} onChange={setWeeklyDigest} />
              <SettingRow title="Connection and data incidents" description="Plugin downtime, delayed heartbeats, schema mismatches, and data-quality changes." checked={incidentAlerts} onChange={setIncidentAlerts} />
              <label className="owner-setting-field"><span><strong>Digest recipients</strong><small>Separate multiple addresses with commas.</small></span><input defaultValue="owner@skyblockx.net, product@skyblockx.net" /></label>
              <label className="owner-setting-field"><span><strong>Delivery schedule</strong><small>Times use the account timezone.</small></span><select defaultValue="Monday, 09:00"><option>Monday, 09:00</option><option>Friday, 16:00</option><option>Daily, 09:00</option></select></label>
            </>
          )}
          {section === "Data & privacy" && (
            <>
              <SettingsHeading icon={Database} title="Data collection & privacy" description="Review event collection, retention, exports, and privacy-conscious defaults." />
              <SettingRow title="Product analytics collection" description="Collect supported server events used for aggregate acquisition, activation, and retention analytics." checked={true} onChange={() => undefined} />
              <SettingRow title="Qualitative feedback analysis" description="Include eligible campaign responses in aggregated theme and sentiment analysis." checked={true} onChange={() => undefined} />
              <label className="owner-setting-field"><span><strong>Analytics retention</strong><small>Aggregate reporting may remain after raw event retention expires.</small></span><select defaultValue="12 months"><option>3 months</option><option>6 months</option><option>12 months</option><option>24 months</option></select></label>
              <button className="owner-settings-action"><Download /> Request server data export</button>
            </>
          )}
          {section === "Team access" && (
            <>
              <SettingsHeading icon={Users} title="Team access" description="Invite teammates and restrict sensitive analytics or configuration capabilities." />
              {([
                ["Samet W.", "Owner", "All servers", "Active"],
                ["Maya Chen", "Analyst", "Skyblock X, PrisonCraft", "Active"],
                ["Leo Parks", "Campaign manager", "Skyblock X", "Invited"],
              ] as const).map(([name, role, scope, state]) => <div className="owner-team-row" key={name}><span className="avatar avatar--small">{name.slice(0, 2)}</span><span><strong>{name}</strong><small>{scope}</small></span><select defaultValue={role}><option>Owner</option><option>Analyst</option><option>Campaign manager</option><option>Server operator</option></select><i>{state}</i><button><MoreHorizontal /></button></div>)}
              <button className="owner-settings-action"><UserPlus /> Invite team member</button>
            </>
          )}
          {section === "Security" && (
            <>
              <SettingsHeading icon={KeyRound} title="Security" description="Protect owner access, plugin credentials, and high-impact configuration actions." />
              <SettingRow title="Require two-step verification" description="All team members must use an additional verification step before accessing owner tools." checked={true} onChange={() => undefined} />
              <SettingRow title="Confirm high-impact changes" description="Require re-authentication before disabling discovery, rotating keys, or changing owner access." checked={true} onChange={() => undefined} />
              <div className="owner-setting-note"><ShieldCheck /><span><strong>Last security review</strong><p>No unusual owner access was identified. Three active sessions and three server keys are currently authorized.</p></span></div>
              <button className="owner-settings-action"><LockKeyhole /> Review sessions and keys</button>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function SettingsHeading({ icon: Icon, title, description }: { icon: typeof Settings; title: string; description: string }) {
  return <div className="owner-settings-heading"><span><Icon /></span><div><h2>{title}</h2><p>{description}</p></div></div>;
}

function SettingRow({ title, description, checked, onChange, disabled = false }: { title: string; description: string; checked: boolean; onChange: (value: boolean) => void; disabled?: boolean }) {
  return <div className={`owner-setting-row ${disabled ? "is-disabled" : ""}`}><span><strong>{title}</strong><small>{description}</small></span><Toggle checked={checked} onChange={onChange} label={title} /></div>;
}

function OwnerSparks({
  server,
  setServer,
}: {
  server: ServerRecord;
  setServer: (server: ServerRecord) => void;
}) {
  const [limit, setLimit] = useState(12000);
  return (
    <div className="dashboard-page owner-platform">
      <OwnerHeader eyebrow="SPARKS MANAGEMENT" title="Sparks controls" description="Configure potential campaign limits, monitor verified activity, and manage optional earn, spend, and notification behavior." server={server} setServer={setServer} action={<Link className="button button--secondary" to="/owner/settings"><Settings /> Sparks settings</Link>} />
      <div className="owner-kpi-grid owner-kpi-grid--analytics">
        {[
          ["Monthly configured limit", limit.toLocaleString(), "All active campaigns"],
          ["Potential exposure", "Up to 8,420", "70.2% of current limit"],
          ["Verified this month", "5,184", "Across 712 participations"],
          ["Pending verification", "1,106", "186 activities in review"],
          ["Available for new limits", "3,580", "Before monthly alert"],
        ].map(([label, value, note]) => <article className="card owner-kpi" key={label}><small>{label}</small><strong>{value}</strong><p><Sparkles /><span>{note}</span></p></article>)}
      </div>
      <div className="owner-dashboard-grid">
        <section className="card">
          <div className="owner-card-heading"><div><h2>Monthly limit</h2><p>This controls potential maximum exposure, not guaranteed Sparks issuance.</p></div><Sparkles /></div>
          <label className="owner-limit-control"><span><strong>{limit.toLocaleString()} Sparks</strong><small>Account-wide monthly configured limit</small></span><input type="range" min="5000" max="25000" step="500" value={limit} onChange={(event) => setLimit(Number(event.target.value))} /></label>
          <div className="owner-limit-track"><i style={{ width: `${Math.min(100, 8420 / limit * 100)}%` }} /></div>
          <div className="owner-limit-labels"><span>0</span><span>Potential exposure: up to 8,420</span><span>{limit.toLocaleString()}</span></div>
          <button className="button button--primary"><Save /> Save monthly limit</button>
        </section>
        <section className="card">
          <div className="owner-card-heading"><div><h2>Allocation by server</h2><p>Potential Sparks limits across this owner portfolio.</p></div><Server /></div>
          {registeredServers.map((item, index) => <div className="owner-allocation-row" key={item.id}><span className="owner-server-mark">{item.name.slice(0, 2).toUpperCase()}</span><span><strong>{item.name}</strong><small>{index === 0 ? "4 active limits" : "2 active limits"}</small></span><div><i style={{ width: `${[74, 48, 32][index] ?? 0}%` }} /></div><b>{([4200, 2700, 1520][index] ?? 0).toLocaleString()}</b></div>)}
        </section>
      </div>
      <section className="card">
        <div className="owner-card-heading"><div><h2>Sparks activity</h2><p>Verified, pending, adjusted, and expired activity across every registered server.</p></div><button><Download /> Export ledger</button></div>
        <div className="owner-table-wrap">
          <table className="owner-table"><thead><tr><th>Date</th><th>Server</th><th>Campaign</th><th>Activity</th><th>Participants</th><th>Sparks</th><th>Status</th></tr></thead><tbody>
            {[
              ["Jul 20, 18:00", "Skyblock X", "First island experience", "Verification batch", "42", "1,180", "VERIFIED"],
              ["Jul 20, 15:30", "PrisonCraft", "Rank-up clarity", "Verification batch", "31", "840", "VERIFIED"],
              ["Jul 20, 12:10", "Skyblock X", "Tutorial clarity study", "Eligibility review", "28", "620", "PENDING"],
              ["Jul 19, 19:42", "Factions Legacy", "New season feedback", "Limit adjustment", "—", "−250", "ADJUSTED"],
            ].map((row) => <tr key={`${row[0]}-${row[2]}`}>{row.map((cell, index) => <td key={`${row[0]}-${index}`}>{index === 2 ? <strong>{cell}</strong> : cell}</td>)}</tr>)}
          </tbody></table>
        </div>
      </section>
    </div>
  );
}

function CampaignBuilder({ server, setServer }: { server: ServerRecord; setServer: (server: ServerRecord) => void }) {
  const [saved, setSaved] = useState(false);
  const [step, setStep] = useState(1);
  return (
    <div className="dashboard-page owner-platform">
      <OwnerHeader eyebrow="CAMPAIGN BUILDER" title="Create a research campaign" description="Define the audience, required activity, evidence, questions, and a cautious verification-dependent Sparks limit." server={server} setServer={setServer} action={<Link className="button button--secondary" to="/owner">Exit builder</Link>} />
      <div className="owner-builder-layout">
        <aside>
          {["Basics", "Audience", "Milestones", "Feedback", "Sparks & capacity", "Review"].map((label, index) => <button className={step === index + 1 ? "active" : step > index + 1 ? "complete" : ""} onClick={() => setStep(index + 1)} key={label}><b>{step > index + 1 ? <Check /> : index + 1}</b><span><strong>{label}</strong><small>{["Name and objective", "Who should participate", "What players will do", "Questions and evidence", "Limits and availability", "Policy and publish"][index]}</small></span></button>)}
        </aside>
        <section className="card owner-builder-form">
          <header><span>STEP {step} OF 6</span><h2>{["Campaign basics", "Audience definition", "Milestones & evidence", "Feedback design", "Sparks & capacity", "Review & submit"][step - 1]}</h2><p>Configure clear, measurable research inputs. Players should understand what may be required before joining.</p></header>
          <div className="form-grid form-grid--two">
            <label>Campaign title<input defaultValue="First island experience" /></label>
            <label>Research category<select><option>Onboarding</option><option>Retention</option><option>Feature evaluation</option><option>Usability</option></select></label>
            <label className="span-two">Research objective<textarea rows={4} defaultValue="Understand where new players hesitate or leave during the first island selection and objective flow." /></label>
            <label>Potential Sparks limit<select><option>Up to 25 Sparks</option><option>Up to 50 Sparks</option><option>Up to 75 Sparks</option><option>Up to 100 Sparks</option></select></label>
            <label>Participant capacity<input type="number" defaultValue="500" /></label>
            <label>Target edition<select><option>Java and Bedrock</option><option>Java</option><option>Bedrock</option></select></label>
            <label>Target player type<select><option>New to this server</option><option>Returning after 30+ days</option><option>Active regulars</option></select></label>
          </div>
          <div className="owner-builder-preview"><Eye /><span><strong>Player-facing preview</strong><small>Eligible verified activity may receive up to the configured Sparks limit. Published amounts are upper limits, not promises.</small></span></div>
          <footer><button onClick={() => setStep(Math.max(1, step - 1))}>Back</button><span>Draft autosaved just now</span><button className="button button--primary" onClick={() => step === 6 ? setSaved(true) : setStep(step + 1)}>{saved ? "Submitted for review" : step === 6 ? "Submit for review" : "Save and continue"}</button></footer>
        </section>
      </div>
    </div>
  );
}

function RegisterServer({ server, setServer }: { server: ServerRecord; setServer: (server: ServerRecord) => void }) {
  const [connected, setConnected] = useState(false);
  return (
    <div className="dashboard-page owner-platform">
      <OwnerHeader eyebrow="SERVER REGISTRATION" title="Register another server" description="Connect another Minecraft server to this owner account and choose its discovery and data settings." server={server} setServer={setServer} action={<Link className="button button--secondary" to="/owner/integrations">Back to registry</Link>} />
      <div className="owner-register-grid">
        <section className="card owner-builder-form">
          <header><span>SERVER DETAILS</span><h2>Add a Minecraft server</h2><p>Each server receives its own key, health monitor, analytics scope, and discovery controls.</p></header>
          <div className="form-grid form-grid--two">
            <label>Server name<input placeholder="Example Network" /></label>
            <label>Server address<input placeholder="play.example.net" /></label>
            <label>Edition<select><option>Java</option><option>Bedrock</option><option>Java and Bedrock</option></select></label>
            <label>Primary version<select><option>1.20.4</option><option>1.20.2</option><option>1.21</option></select></label>
            <label>Primary category<select><option>Survival</option><option>Skyblock</option><option>Prison</option><option>Minigames</option></select></label>
            <label>Owner role<select><option>Owner</option><option>Authorized administrator</option></select></label>
          </div>
          <SettingRow title="Enable discovery after verification" description="The listing may appear after ownership and safety review." checked={true} onChange={() => undefined} />
          <SettingRow title="Enable aggregate product analytics" description="Collect supported privacy-conscious events after the plugin connects." checked={true} onChange={() => undefined} />
          <button className="button button--primary" onClick={() => setConnected(true)}><Link2 />{connected ? "Registration started" : "Register and create key"}</button>
        </section>
        <aside className="card owner-registration-checklist">
          <h2>What happens next</h2>
          {[
            ["Ownership check", "Verify control of the server address or plugin key."],
            ["Plugin connection", "Install Nortix and confirm a signed heartbeat."],
            ["Safety review", "Nortix may review listing and campaign eligibility."],
            ["Data readiness", "Supported events receive a quality and schema check."],
            ["Discovery", "The server may appear after approval if discovery is enabled."],
          ].map(([title, note], index) => <div key={title}><b>{index + 1}</b><span><strong>{title}</strong><small>{note}</small></span></div>)}
        </aside>
      </div>
    </div>
  );
}
