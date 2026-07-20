import {
  Activity,
  BarChart3,
  Check,
  ChevronRight,
  ClipboardCheck,
  Eye,
  Gauge,
  KeyRound,
  LockKeyhole,
  MessageSquare,
  Pause,
  Radio,
  Save,
  Search,
  Send,
  Server,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { NavLink } from "react-router-dom";
import { Button, Card } from "@nortix/ui";
import { campaigns } from "../features/demo-data";
import { Modal } from "../components/Modal";

const sections = [
  ["Overview", "/admin", Gauge],
  ["Users & access", "/admin/users", Users],
  ["Servers", "/admin/servers", Server],
  ["Campaign moderation", "/admin/campaigns", ClipboardCheck],
  ["Reports & cases", "/admin/reports", ShieldAlert],
  ["Admin messages", "/admin/messages", MessageSquare],
  ["Roles & permissions", "/admin/access", KeyRound],
  ["Live activity monitor", "/admin/monitor", Radio],
  ["Product analytics", "/admin/analytics", BarChart3],
  ["Umami usage", "/admin/umami", Activity],
  ["Activity logs", "/admin/audit-logs", Eye],
  ["Termination tools", "/admin/termination", Trash2],
  ["System settings", "/admin/settings", Settings],
] as const;

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sectionSearch, setSectionSearch] = useState("");
  const visibleSections = sections.filter(([label]) =>
    label.toLowerCase().includes(sectionSearch.toLowerCase()),
  );

  return (
    <div className="admin-page admin-v2">
      <div className="admin-banner">
        <ShieldCheck />
        <div>
          <strong>Nortix administration</strong>
          <small>Full actions are permission-gated, confirmed, and written to the audit log.</small>
        </div>
        <span className="admin-role">NORTIX ADMIN</span>
      </div>
      <div className="admin-layout">
        <aside>
          <label>
            <Search />
            <input
              value={sectionSearch}
              onChange={(event) => setSectionSearch(event.target.value)}
              placeholder="Find a tool..."
            />
          </label>
          <nav>
            {visibleSections.map(([label, path, Icon]) => (
              <NavLink key={path} to={path} end={path === "/admin"}>
                <Icon />
                {label}
              </NavLink>
            ))}
          </nav>
          <NavLink className="button button--secondary" to="/dashboard">
            Return to product
          </NavLink>
        </aside>
        <main>{children}</main>
      </div>
    </div>
  );
}

const AdminHeading = ({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) => (
  <div className="dashboard-heading admin-v2-heading">
    <div>
      <span className="eyebrow">INTERNAL CONTROL CENTER</span>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
    {action}
  </div>
);

const overviewEvents = [
  ["admin@nortix", "USER_ACCESS_UPDATED", "QuartzTester", "2m ago"],
  ["moderator@nortix", "CAMPAIGN_PAUSED", "Arcane academy", "7m ago"],
  ["system", "RATE_LIMIT_TRIGGERED", "api/session", "11m ago"],
  ["admin@nortix", "SERVER_RECORD_EDITED", "Skyblock X", "18m ago"],
] as const;

export function AdminOverviewPage() {
  const [maintenance, setMaintenance] = useState(false);
  const [messageOpen, setMessageOpen] = useState(false);

  return (
    <>
      <AdminHeading
        title="Operations overview"
        description="Moderation, access, platform usage, live signals, Sparks policy, and system controls."
        action={
          <Button onClick={() => setMessageOpen(true)}>
            <Send /> Message users
          </Button>
        }
      />
      <div className="admin-kpi-grid">
        {[
          { Icon: Users, label: "Active users", value: "18", note: "+3 this week" },
          { Icon: Server, label: "Published servers", value: "12", note: "2 need review" },
          { Icon: ClipboardCheck, label: "Open moderation", value: "7", note: "Oldest 43 min" },
          { Icon: Sparkles, label: "Sparks issued today", value: "1,840", note: "All policy-limited" },
          { Icon: Radio, label: "Live sessions", value: "31", note: "4 admin sessions" },
          { Icon: Activity, label: "Events / min", value: "286", note: "Within baseline" },
        ].map(({ Icon, label, value, note }) => (
          <Card key={label}>
            <Icon />
            <small>{label}</small>
            <strong>{value}</strong>
            <span>{note}</span>
          </Card>
        ))}
      </div>

      <div className="admin-command-grid">
        <Card>
          <div className="data-card__header">
            <div>
              <h2>Live platform monitor</h2>
              <p>Operational signals refresh locally in this prototype.</p>
            </div>
            <span className="live-pill">LIVE</span>
          </div>
          <div className="admin-signal-grid">
            {[
              ["Web app", "Operational", "118 ms"],
              ["API", "Operational", "94 ms"],
              ["Database", "Operational", "36 ms"],
              ["Authentication", "Operational", "99.98%"],
              ["Minecraft events", "Elevated", "7 retries"],
              ["Moderation queue", "Attention", "7 open"],
            ].map(([label, status, value]) => (
              <div key={label}>
                <i className={status === "Operational" ? "signal-good" : "signal-warn"} />
                <span>
                  <strong>{label}</strong>
                  <small>{status}</small>
                </span>
                <b>{value}</b>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h2>System controls</h2>
          <p>High-impact actions would require a reason and explicit confirmation.</p>
          <label className="admin-toggle-row">
            <span>
              <strong>Maintenance mode</strong>
              <small>Limit new sessions while preserving admin access.</small>
            </span>
            <input
              type="checkbox"
              checked={maintenance}
              onChange={(event) => setMaintenance(event.target.checked)}
            />
          </label>
          <label className="admin-toggle-row">
            <span>
              <strong>Campaign joins</strong>
              <small>Allow players to begin new campaign activity.</small>
            </span>
            <input type="checkbox" defaultChecked />
          </label>
          <label className="admin-toggle-row">
            <span>
              <strong>Sparks issuance</strong>
              <small>Could pause all automated Sparks issuance.</small>
            </span>
            <input type="checkbox" defaultChecked />
          </label>
        </Card>
      </div>

      <Card className="data-card">
        <div className="data-card__header">
          <div>
            <h2>Recent administrative activity</h2>
            <p>Security-relevant changes are represented as append-only records.</p>
          </div>
          <NavLink to="/admin/audit-logs">Open full log</NavLink>
        </div>
        <AdminLogTable rows={overviewEvents} />
      </Card>

      {messageOpen && <AdminMessageComposer onClose={() => setMessageOpen(false)} />}
    </>
  );
}

export function CampaignReviewPage() {
  const [selected, setSelected] = useState<(typeof campaigns)[number] | null>(null);
  const [resolved, setResolved] = useState<string[]>([]);

  return (
    <>
      <AdminHeading
        title="Campaign moderation"
        description="Review task clarity, Sparks limits, verification, safety, and owner history."
      />
      <div className="admin-queue">
        {campaigns
          .slice(0, 5)
          .filter((campaign) => !resolved.includes(campaign.id))
          .map((campaign, index) => (
            <Card className="review-queue-card" key={campaign.id}>
              <div className="review-queue-card__header">
                <span className={`server-inline__logo server-art--${campaign.server.art}`}>
                  {campaign.server.name.slice(0, 2)}
                </span>
                <div>
                  <h2>{campaign.title}</h2>
                  <p>{campaign.server.name} · submitted {index + 1}h ago</p>
                </div>
                <span className="admin-status">{index === 0 ? "NEEDS REVIEW" : "SUBMITTED"}</span>
              </div>
              <div className="review-card-stats">
                <span>
                  <small>Potential Sparks</small>
                  <strong>Up to {campaign.sparks}</strong>
                </span>
                <span>
                  <small>Verification</small>
                  <strong>Manual</strong>
                </span>
                <span>
                  <small>Capacity</small>
                  <strong>{campaign.participants}</strong>
                </span>
                <span>
                  <small>Risk score</small>
                  <strong>{18 + index * 9}/100</strong>
                </span>
                <span>
                  <small>Owner status</small>
                  <strong>Verified</strong>
                </span>
              </div>
              <div className="review-queue-card__footer">
                <span>{campaign.milestones.length} tasks · {campaign.duration} estimated</span>
                <Button variant="secondary" onClick={() => setSelected(campaign)}>
                  Open review
                </Button>
              </div>
            </Card>
          ))}
      </div>
      {selected && (
        <Modal title="Moderate campaign" onClose={() => setSelected(null)}>
          <div className="modal__body admin-editor">
            <div className="form-grid form-grid--two">
              <label>
                Campaign title
                <input defaultValue={selected.title} />
              </label>
              <label>
                Potential Sparks limit
                <select defaultValue={String(selected.sparks)}>
                  <option value="25">Up to 25 Sparks</option>
                  <option value="50">Up to 50 Sparks</option>
                  <option value="75">Up to 75 Sparks</option>
                  <option value="100">Up to 100 Sparks</option>
                </select>
              </label>
              <label className="span-two">
                Public description
                <textarea defaultValue={selected.description} rows={3} />
              </label>
              <label>
                Status
                <select defaultValue="UNDER_REVIEW">
                  <option>UNDER_REVIEW</option>
                  <option>ACTIVE</option>
                  <option>PAUSED</option>
                  <option>REJECTED</option>
                </select>
              </label>
              <label>
                Internal reason
                <input placeholder="Required for restrictive actions" />
              </label>
            </div>
          </div>
          <div className="modal__footer modal__footer--spread">
            <div>
              <Button variant="danger" onClick={() => setResolved([...resolved, selected.id])}>
                <X /> Reject
              </Button>
              <Button variant="secondary">
                <Pause /> Pause
              </Button>
            </div>
            <Button
              onClick={() => {
                setResolved([...resolved, selected.id]);
                setSelected(null);
              }}
            >
              <Check /> Approve changes
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}

export function WithdrawalReviewPage() {
  const [editing, setEditing] = useState(false);
  return (
    <>
      <AdminHeading
        title="Sparks adjustment review"
        description="Review manual Sparks corrections, reversals, limits, and policy exceptions."
      />
      <Card className="data-card">
        <div className="data-card__header">
          <div>
            <h2>Pending adjustments</h2>
            <p>Adjustments may be approved, changed, or rejected with an audit reason.</p>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Requested change</th>
                <th>Reason</th>
                <th>Risk</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {[
                ["QuartzTester", "+25 Sparks", "Quest verification correction", "Low"],
                ["OakStorm", "-40 Sparks", "Duplicate campaign activity", "Review"],
              ].map((row, index) => (
                <tr key={row[0]}>
                  <td><strong>{row[0]}</strong></td>
                  <td>{row[1]}</td>
                  <td>{row[2]}</td>
                  <td>{row[3]}</td>
                  <td><span className="admin-status">PENDING</span></td>
                  <td>
                    <Button variant="secondary" onClick={() => index === 0 && setEditing(true)}>
                      Review
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      {editing && (
        <Modal title="Review Sparks adjustment" onClose={() => setEditing(false)}>
          <div className="modal__body admin-editor">
            <label>
              Adjustment
              <input defaultValue="+25" />
            </label>
            <label>
              Internal reason
              <textarea rows={3} defaultValue="Quest verification correction" />
            </label>
            <p className="form-note">
              <LockKeyhole /> Saving would create an immutable audit event.
            </p>
          </div>
          <div className="modal__footer">
            <Button variant="danger" onClick={() => setEditing(false)}>Reject</Button>
            <Button onClick={() => setEditing(false)}>Approve adjustment</Button>
          </div>
        </Modal>
      )}
    </>
  );
}

type ManagedRecord = {
  id: string;
  name: string;
  type: string;
  status: string;
  access: string;
  updated: string;
};

const records: ManagedRecord[] = [
  { id: "usr_102", name: "QuartzTester", type: "User", status: "ACTIVE", access: "Player", updated: "2m ago" },
  { id: "srv_014", name: "Skyblock X", type: "Server", status: "PUBLISHED", access: "Verified owner", updated: "8m ago" },
  { id: "usr_087", name: "OakStorm", type: "User", status: "LIMITED", access: "Player", updated: "22m ago" },
  { id: "srv_009", name: "Arcane Realms", type: "Server", status: "UNDER_REVIEW", access: "Owner", updated: "1h ago" },
];

export function AdminGenericPage({
  title,
  description,
  type = "generic",
}: {
  title: string;
  description: string;
  type?: string;
}) {
  if (type === "messages") return <AdminMessagesPage />;
  if (type === "analytics" || type === "umami") return <AdminAnalyticsPage type={type} />;
  if (type === "monitor") return <AdminMonitorPage />;
  if (type === "audit") return <AdminAuditPage />;
  if (type === "termination") return <AdminTerminationPage />;
  if (type === "access") return <AdminAccessPage />;

  return <EntityManagementPage title={title} description={description} type={type} />;
}

function EntityManagementPage({
  title,
  description,
  type,
}: {
  title: string;
  description: string;
  type: string;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<ManagedRecord | null>(null);
  const [rows, setRows] = useState(records);
  const scopedRows = type === "users"
    ? rows.filter((row) => row.type === "User")
    : type === "servers"
      ? rows.filter((row) => row.type === "Server")
      : rows;
  const filtered = scopedRows.filter((row) =>
    `${row.name} ${row.type} ${row.status} ${row.access}`.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <>
      <AdminHeading title={title} description={description} action={<Button><Save /> Save view</Button>} />
      <Card className="data-card">
        <div className="data-card__header">
          <div>
            <h2>{title}</h2>
            <p>Search, inspect, edit, restrict, restore, or terminate records within your role.</p>
          </div>
          <label className="table-search">
            <Search />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search records..." />
          </label>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Subject</th>
                <th>Type</th>
                <th>Status</th>
                <th>Access</th>
                <th>Updated</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id}>
                  <td><code>{row.id}</code></td>
                  <td><strong>{row.name}</strong></td>
                  <td>{row.type}</td>
                  <td><span className="admin-status">{row.status}</span></td>
                  <td>{row.access}</td>
                  <td>{row.updated}</td>
                  <td>
                    <button className="icon-button" onClick={() => setSelected(row)} aria-label={`Edit ${row.name}`}>
                      <ChevronRight />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      {selected && (
        <RecordEditor
          record={selected}
          onClose={() => setSelected(null)}
          onSave={(next) => {
            setRows(rows.map((row) => (row.id === next.id ? next : row)));
            setSelected(null);
          }}
        />
      )}
    </>
  );
}

function RecordEditor({
  record,
  onClose,
  onSave,
}: {
  record: ManagedRecord;
  onClose: () => void;
  onSave: (record: ManagedRecord) => void;
}) {
  const [draft, setDraft] = useState(record);
  const [confirmation, setConfirmation] = useState("");

  return (
    <Modal title={`Edit ${record.name}`} onClose={onClose}>
      <div className="modal__body admin-editor">
        <div className="form-grid form-grid--two">
          <label>
            Display name
            <input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
          </label>
          <label>
            Status
            <select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })}>
              <option>ACTIVE</option>
              <option>LIMITED</option>
              <option>UNDER_REVIEW</option>
              <option>SUSPENDED</option>
              <option>TERMINATED</option>
            </select>
          </label>
          <label>
            Access role
            <select value={draft.access} onChange={(event) => setDraft({ ...draft, access: event.target.value })}>
              <option>Player</option>
              <option>Owner</option>
              <option>Moderator</option>
              <option>Nortix admin</option>
              <option>No access</option>
            </select>
          </label>
          <label>
            Sparks balance
            <input defaultValue="12430" inputMode="numeric" />
          </label>
          <label className="span-two">
            Administrative reason
            <textarea rows={3} placeholder="Required for access or status changes" />
          </label>
        </div>
        <div className="admin-danger-zone">
          <strong>Termination safeguard</strong>
          <p>Type the record ID to enable termination. This would revoke access and preserve an audit record.</p>
          <input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder={record.id} />
          <Button
            variant="danger"
            disabled={confirmation !== record.id}
            onClick={() => setDraft({ ...draft, status: "TERMINATED", access: "No access" })}
          >
            <Trash2 /> Terminate record
          </Button>
        </div>
      </div>
      <div className="modal__footer">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={() => onSave({ ...draft, updated: "just now" })}><Save /> Save audited changes</Button>
      </div>
    </Modal>
  );
}

function AdminMessagesPage() {
  const [composer, setComposer] = useState(false);
  const [messages, setMessages] = useState([
    ["Campaign verification update", "All players", "Sent", "12 min ago"],
    ["Owner policy reminder", "Server owners", "Scheduled", "Tomorrow"],
    ["Maintenance notice", "Active sessions", "Draft", "Not sent"],
  ]);

  return (
    <>
      <AdminHeading
        title="Admin messages"
        description="Send targeted in-product messages, banners, policy notices, or urgent interventions."
        action={<Button onClick={() => setComposer(true)}><Send /> New message</Button>}
      />
      <Card className="data-card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Message</th><th>Audience</th><th>Status</th><th>Delivery</th><th /></tr></thead>
            <tbody>
              {messages.map((message) => (
                <tr key={message[0]}>
                  <td><strong>{message[0]}</strong></td>
                  <td>{message[1]}</td>
                  <td><span className="admin-status">{message[2]}</span></td>
                  <td>{message[3]}</td>
                  <td><button className="icon-button"><ChevronRight /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      {composer && (
        <AdminMessageComposer
          onClose={() => setComposer(false)}
          onSend={(title) => setMessages([[title, "All players", "Sent", "just now"], ...messages])}
        />
      )}
    </>
  );
}

function AdminMessageComposer({
  onClose,
  onSend,
}: {
  onClose: () => void;
  onSend?: (title: string) => void;
}) {
  const [title, setTitle] = useState("Important Nortix update");
  return (
    <Modal title="Compose admin message" onClose={onClose}>
      <div className="modal__body admin-editor">
        <label>
          Audience
          <select defaultValue="players">
            <option value="players">All players</option>
            <option value="owners">All server owners</option>
            <option value="active">Active sessions</option>
            <option value="limited">Limited accounts</option>
          </select>
        </label>
        <label>
          Title
          <input value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <label>
          Message
          <textarea rows={5} defaultValue="Nortix administrators have shared an update. Please review the latest platform guidance." />
        </label>
        <label className="checkbox-row">
          <input type="checkbox" defaultChecked />
          <span>Show as an unread in-product message</span>
        </label>
      </div>
      <div className="modal__footer">
        <Button variant="ghost" onClick={onClose}>Save draft</Button>
        <Button onClick={() => { onSend?.(title); onClose(); }}><Send /> Send message</Button>
      </div>
    </Modal>
  );
}

function AdminAnalyticsPage({ type }: { type: string }) {
  const [range, setRange] = useState("7 days");
  return (
    <>
      <AdminHeading
        title={type === "umami" ? "Umami usage analytics" : "Product analytics"}
        description="Privacy-conscious traffic, engagement, campaign, search, and retention signals."
        action={
          <select className="admin-range" value={range} onChange={(event) => setRange(event.target.value)}>
            <option>24 hours</option><option>7 days</option><option>30 days</option>
          </select>
        }
      />
      <div className="admin-kpi-grid">
        {[
          ["Visitors", "8,492", "+12.4%"],
          ["Sessions", "11,804", "+8.1%"],
          ["Campaign views", "24,610", "+18.7%"],
          ["Searches", "6,203", "+5.2%"],
          ["Quest interactions", "3,882", "+9.6%"],
          ["Return rate", "41.8%", "+2.3%"],
        ].map(([label, value, trend]) => (
          <Card key={label}><small>{label}</small><strong>{value}</strong><span className="positive">{trend}</span></Card>
        ))}
      </div>
      <div className="admin-command-grid">
        <Card>
          <h2>Usage over time</h2>
          <div className="admin-chart" aria-label="Usage chart">
            {[38, 52, 44, 68, 61, 82, 74, 91, 80, 96, 87, 100].map((height, index) => (
              <i style={{ height: `${height}%` }} key={index} />
            ))}
          </div>
        </Card>
        <Card>
          <h2>Top product routes</h2>
          {[
            ["/dashboard", "31%"],
            ["/campaigns", "24%"],
            ["/servers", "18%"],
            ["/dashboard/quests", "11%"],
            ["/owner", "7%"],
          ].map(([route, share]) => (
            <div className="analytics-route" key={route}><code>{route}</code><strong>{share}</strong></div>
          ))}
        </Card>
      </div>
      <Card>
        <h2>{type === "umami" ? "Umami integration" : "Measurement controls"}</h2>
        <p>
          {type === "umami"
            ? "Connect a self-hosted Umami instance with a site ID and endpoint. No tracking script is enabled in this prototype."
            : "Event names, retention windows, and privacy rules could be configured here."}
        </p>
        <div className="form-grid form-grid--two">
          <label>Endpoint<input placeholder="https://analytics.example.com" /></label>
          <label>Website ID<input placeholder="Umami website ID" /></label>
        </div>
        <Button><Save /> Save analytics configuration</Button>
      </Card>
    </>
  );
}

function AdminMonitorPage() {
  const [paused, setPaused] = useState(false);
  const events = [
    ["SESSION_STARTED", "usr_102", "dashboard", "now"],
    ["SEARCH_PERFORMED", "usr_087", "skyblock", "4s"],
    ["CAMPAIGN_VIEWED", "usr_102", "campaign-1", "8s"],
    ["RATE_LIMIT_CHECK", "api", "allowed", "12s"],
    ["ADMIN_RECORD_OPENED", "admin@nortix", "srv_014", "18s"],
  ];
  return (
    <>
      <AdminHeading
        title="Live activity monitor"
        description="Observe recent platform events, sessions, errors, moderation triggers, and unusual patterns."
        action={<Button variant="secondary" onClick={() => setPaused(!paused)}>{paused ? "Resume stream" : "Pause stream"}</Button>}
      />
      <div className="admin-command-grid">
        <Card>
          <h2>Live event stream</h2>
          <div className="live-event-stream">
            {events.map((event) => (
              <div key={event.join("-")}><i /><code>{event[0]}</code><span>{event[1]}</span><b>{event[2]}</b><small>{event[3]}</small></div>
            ))}
          </div>
        </Card>
        <Card>
          <h2>Active monitors</h2>
          {[
            ["Repeated verification attempts", "Enabled"],
            ["Rapid account switching", "Enabled"],
            ["Unusual Sparks changes", "Enabled"],
            ["Server event replay", "Enabled"],
            ["Admin privilege changes", "Always on"],
          ].map(([label, status]) => (
            <label className="admin-toggle-row" key={label}>
              <span><strong>{label}</strong><small>{status}</small></span>
              <input type="checkbox" defaultChecked />
            </label>
          ))}
        </Card>
      </div>
    </>
  );
}

function AdminAuditPage() {
  const [filter, setFilter] = useState("");
  const rows = overviewEvents.filter((row) => row.join(" ").toLowerCase().includes(filter.toLowerCase()));
  return (
    <>
      <AdminHeading title="Activity logs" description="Search administrative, moderation, security, and system events." />
      <Card className="data-card">
        <div className="data-card__header">
          <label className="table-search"><Search /><input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Filter logs..." /></label>
          <Button variant="secondary">Export filtered log</Button>
        </div>
        <AdminLogTable rows={rows} />
      </Card>
    </>
  );
}

function AdminLogTable({ rows }: { rows: readonly (readonly string[])[] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>Actor</th><th>Action</th><th>Target</th><th>Time</th></tr></thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.join("-")}><td>{row[0]}</td><td><code>{row[1]}</code></td><td>{row[2]}</td><td>{row[3]}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AdminAccessPage() {
  const [saved, setSaved] = useState(false);
  return (
    <>
      <AdminHeading title="Roles & permissions" description="Control staff roles with least-privilege defaults and audited changes." />
      <Card className="permission-matrix">
        <div className="permission-row permission-row--head"><b>Capability</b><b>Moderator</b><b>Analyst</b><b>Nortix admin</b></div>
        {["Review reports", "Edit servers", "Edit users", "Send messages", "View analytics", "Terminate access", "Manage admin roles"].map((capability, index) => (
          <div className="permission-row" key={capability}>
            <strong>{capability}</strong>
            <input type="checkbox" defaultChecked={index < 2} />
            <input type="checkbox" defaultChecked={index === 4} />
            <input type="checkbox" defaultChecked />
          </div>
        ))}
        <Button onClick={() => setSaved(true)}><Save /> {saved ? "Permissions saved" : "Save permission matrix"}</Button>
      </Card>
    </>
  );
}

function AdminTerminationPage() {
  const [target, setTarget] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [completed, setCompleted] = useState(false);
  return (
    <>
      <AdminHeading
        title="Termination tools"
        description="Revoke access, terminate records, invalidate sessions, or remove published entities with safeguards."
      />
      <Card className="termination-console">
        <ShieldAlert />
        <h2>Protected destructive action</h2>
        <p>
          Enter an exact user, server, campaign, or session ID. The action would require a reason,
          typed confirmation, role permission, and an immutable audit event.
        </p>
        <label>Target ID<input value={target} onChange={(event) => setTarget(event.target.value)} placeholder="usr_102 or srv_014" /></label>
        <label>Reason<textarea rows={3} placeholder="Required moderation or security reason" /></label>
        <label>Type TERMINATE {target || "TARGET"}<input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label>
        <div className="termination-options">
          <label><input type="checkbox" defaultChecked /> Revoke active sessions</label>
          <label><input type="checkbox" defaultChecked /> Disable new authentication</label>
          <label><input type="checkbox" /> Unpublish associated content</label>
          <label><input type="checkbox" /> Schedule data retention review</label>
        </div>
        <Button
          variant="danger"
          disabled={!target || confirmation !== `TERMINATE ${target}`}
          onClick={() => setCompleted(true)}
        >
          <Trash2 /> {completed ? "Termination recorded" : "Execute termination"}
        </Button>
      </Card>
    </>
  );
}
