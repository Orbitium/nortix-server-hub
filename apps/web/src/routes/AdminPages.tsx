import {
  Activity,
  AlertTriangle,
  Archive,
  Check,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  CreditCard,
  Eye,
  FileClock,
  FileWarning,
  Flag,
  Gauge,
  ListChecks,
  Pause,
  Search,
  Server,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Users,
  WalletCards,
  X,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { NavLink } from "react-router-dom";
import { Badge, Button, Card, StatusChip } from "@nortix/ui";
import { campaigns } from "../features/demo-data";
import { Modal } from "../components/Modal";

const sections = [
  ["Overview", "/admin", Gauge],
  ["Users", "/admin/users", Users],
  ["Servers", "/admin/servers", Server],
  ["Ownership verification", "/admin/ownership", ShieldCheck],
  ["Campaign review queue", "/admin/campaigns", ClipboardCheck],
  ["Milestone templates", "/admin/milestones", ListChecks],
  ["Participations", "/admin/participations", Activity],
  ["Completion disputes", "/admin/disputes", FileWarning],
  ["Withdrawals", "/admin/withdrawals", WalletCards],
  ["Payment events", "/admin/payments", CreditCard],
  ["Ledger", "/admin/ledger", CircleDollarSign],
  ["Promotional credits", "/admin/promotional-credits", Sparkles],
  ["Fraud flags", "/admin/fraud", Flag],
  ["Reports", "/admin/reports", ShieldAlert],
  ["Reviews", "/admin/reviews", FileClock],
  ["Audit logs", "/admin/audit-logs", Eye],
  ["Feature flags", "/admin/feature-flags", Zap],
  ["System settings", "/admin/settings", Settings],
] as const;

export function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-page">
      <div className="admin-banner">
        <ShieldCheck />
        <div>
          <strong>Nortix internal operations</strong>
          <small>Private data and risk signals are restricted to authorized staff.</small>
        </div>
        <Badge tone="warning">MODERATOR</Badge>
      </div>
      <div className="admin-layout">
        <aside>
          <label>
            <Search />
            <input placeholder="Find a section…" />
          </label>
          <nav>
            {sections.map(([label, path, Icon]) => (
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
  <div className="dashboard-heading">
    <div>
      <span className="eyebrow">INTERNAL</span>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
    {action}
  </div>
);

export function AdminOverviewPage() {
  return (
    <>
      <AdminHeading
        title="Operations Overview"
        description="Moderation queues, financial reviews, risk flags, and platform health."
      />
      <div className="quick-stats">
        <Card>
          <span className="stat-icon stat-icon--blue">
            <Users />
          </span>
          <div>
            <small>Total users</small>
            <strong>20</strong>
            <span>18 active this week</span>
          </div>
        </Card>
        <Card>
          <span className="stat-icon stat-icon--green">
            <Server />
          </span>
          <div>
            <small>Listed servers</small>
            <strong>12</strong>
            <span>2 pending ownership</span>
          </div>
        </Card>
        <Card>
          <span className="stat-icon stat-icon--purple">
            <ClipboardCheck />
          </span>
          <div>
            <small>Campaign reviews</small>
            <strong>3</strong>
            <span>Oldest: 18 hours</span>
          </div>
        </Card>
        <Card>
          <span className="stat-icon stat-icon--gold">
            <WalletCards />
          </span>
          <div>
            <small>Withdrawal reviews</small>
            <strong>2</strong>
            <span>$38.00 requested</span>
          </div>
        </Card>
      </div>
      <div className="admin-overview-grid">
        <Card>
          <div className="data-card__header">
            <div>
              <h2>Priority queue</h2>
              <p>Oldest and highest-risk actions first.</p>
            </div>
          </div>
          <div className="priority-list">
            {[
              ["Completion dispute", "Player disputes rejected tutorial evidence", "HIGH", "14m"],
              ["Withdrawal review", "First payout for 96-day account", "NORMAL", "1h"],
              ["Campaign review", "Season launch survival test", "NORMAL", "5h"],
              ["Fraud flag", "Suspicious completion speed pattern", "HIGH", "9h"],
            ].map(([type, summary, priority, age]) => (
              <div key={summary}>
                <span
                  className={
                    priority === "HIGH" ? "priority-icon priority-icon--high" : "priority-icon"
                  }
                >
                  <AlertTriangle />
                </span>
                <span>
                  <strong>{type}</strong>
                  <small>{summary}</small>
                </span>
                <Badge tone={priority === "HIGH" ? "danger" : "neutral"}>{priority}</Badge>
                <small>{age}</small>
                <ChevronRight />
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h2>System signals</h2>
          <div className="system-signals">
            <div>
              <span>
                <i className="signal-good" /> API health
              </span>
              <strong>Operational</strong>
            </div>
            <div>
              <span>
                <i className="signal-good" /> Database
              </span>
              <strong>Operational</strong>
            </div>
            <div>
              <span>
                <i className="signal-good" /> Mock payouts
              </span>
              <strong>Operational</strong>
            </div>
            <div>
              <span>
                <i className="signal-warn" /> Minecraft events
              </span>
              <strong>Simulator only</strong>
            </div>
          </div>
          <hr />
          <h3>Last reconciliation</h3>
          <p className="mono-line">Ledger totals match cached summaries · 6m ago</p>
        </Card>
      </div>
      <Card className="data-card">
        <div className="data-card__header">
          <div>
            <h2>Recent admin activity</h2>
            <p>Important actions are append-only audit records.</p>
          </div>
          <NavLink to="/admin/audit-logs">View all</NavLink>
        </div>
        <AdminTable type="audit" />
      </Card>
    </>
  );
}

export function CampaignReviewPage() {
  const [selected, setSelected] = useState<(typeof campaigns)[number] | null>(null);
  const [resolved, setResolved] = useState<string[]>([]);
  return (
    <>
      <AdminHeading
        title="Campaign Review Queue"
        description="Validate server context, milestones, economics, abuse risks, and owner history."
      />
      <div className="admin-queue">
        {campaigns
          .slice(0, 3)
          .filter((item) => !resolved.includes(item.id))
          .map((campaign, index) => (
            <Card className="review-queue-card" key={campaign.id}>
              <div className="review-queue-card__header">
                <span className={`server-inline__logo server-art--${campaign.server.art}`}>
                  {campaign.server.name.slice(0, 2)}
                </span>
                <div>
                  <h2>{campaign.title}</h2>
                  <p>
                    {campaign.server.name} · Submitted {index + 2} hours ago
                  </p>
                </div>
                <StatusChip status={index === 0 ? "UNDER_REVIEW" : "SUBMITTED"} />
              </div>
              <div className="review-card-stats">
                <span>
                  <small>Public reward</small>
                  <strong>${(campaign.rewardCents / 100).toFixed(2)}</strong>
                </span>
                <span>
                  <small>Internal budget</small>
                  <strong>${((campaign.rewardCents * 150) / 100).toFixed(2)}</strong>
                </span>
                <span>
                  <small>Internal reward cost</small>
                  <strong>${((campaign.rewardCents * 0.78) / 100).toFixed(2)} / complete</strong>
                </span>
                <span>
                  <small>Margin estimate</small>
                  <strong>22%</strong>
                </span>
                <span>
                  <small>Risk score</small>
                  <strong>{18 + index * 11}/100</strong>
                </span>
              </div>
              <div className="validation-warnings">
                {index === 0 ? (
                  <span className="warning">
                    <AlertTriangle /> Screenshot evidence wording may be too broad.
                  </span>
                ) : (
                  <span className="positive">
                    <Check /> Automated validation passed.
                  </span>
                )}
              </div>
              <div className="review-queue-card__footer">
                <span>
                  {campaign.milestones.length} milestones · {campaign.duration} expected
                </span>
                <Button variant="secondary" onClick={() => setSelected(campaign)}>
                  Open review
                </Button>
              </div>
            </Card>
          ))}
      </div>
      {selected && (
        <Modal title="Review campaign" onClose={() => setSelected(null)}>
          <div className="modal__body review-modal">
            <div className="review-modal__server">
              <span className={`server-inline__logo server-art--${selected.server.art}`}>
                {selected.server.name.slice(0, 2)}
              </span>
              <div>
                <h3>{selected.title}</h3>
                <p>{selected.server.name} · Verified owner</p>
              </div>
            </div>
            <div className="review-grid">
              <Card>
                <h3>Public configuration</h3>
                <dl>
                  <div>
                    <dt>Reward</dt>
                    <dd>${(selected.rewardCents / 100).toFixed(2)}</dd>
                  </div>
                  <div>
                    <dt>Sparks</dt>
                    <dd>{selected.sparks}</dd>
                  </div>
                  <div>
                    <dt>Expected duration</dt>
                    <dd>{selected.duration}</dd>
                  </div>
                  <div>
                    <dt>Capacity</dt>
                    <dd>150</dd>
                  </div>
                </dl>
              </Card>
              <Card>
                <h3>Internal economics</h3>
                <dl>
                  <div>
                    <dt>Campaign budget</dt>
                    <dd>${((selected.rewardCents * 150) / 100).toFixed(2)}</dd>
                  </div>
                  <div>
                    <dt>Reward cost</dt>
                    <dd>${((selected.rewardCents * 0.78) / 100).toFixed(2)}</dd>
                  </div>
                  <div>
                    <dt>Margin estimate</dt>
                    <dd>22%</dd>
                  </div>
                  <div>
                    <dt>Risk score</dt>
                    <dd>18/100</dd>
                  </div>
                </dl>
              </Card>
            </div>
            <h3>Milestones</h3>
            <div className="modal-milestones">
              {selected.milestones.map((milestone, index) => (
                <div key={milestone.id}>
                  <b>{index + 1}</b>
                  <span>
                    <strong>{milestone.title}</strong>
                    <small>{milestone.description}</small>
                  </span>
                  <strong>${(milestone.rewardCents / 100).toFixed(2)}</strong>
                </div>
              ))}
            </div>
            <label>
              Internal note
              <textarea rows={3} placeholder="Reason or context for the audit log…" />
            </label>
          </div>
          <div className="modal__footer modal__footer--spread">
            <div>
              <Button
                variant="danger"
                onClick={() => {
                  setResolved([...resolved, selected.id]);
                  setSelected(null);
                }}
              >
                <X /> Reject
              </Button>
              <Button variant="secondary">
                <Archive /> Archive
              </Button>
              <Button variant="secondary">
                <Pause /> Pause
              </Button>
            </div>
            <div>
              <Button variant="secondary">Request changes</Button>
              <Button
                onClick={() => {
                  setResolved([...resolved, selected.id]);
                  setSelected(null);
                }}
              >
                <Check /> Approve
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

export function WithdrawalReviewPage() {
  const [reviewing, setReviewing] = useState(false);
  return (
    <>
      <AdminHeading
        title="Withdrawal Review"
        description="Review payout requests with limited, relevant risk and account context."
      />
      <Card className="data-card">
        <div className="data-card__header">
          <div>
            <h2>Open requests</h2>
            <p>Destination details are masked until needed for processing.</p>
          </div>
          <div className="segmented">
            <button className="active">Open 2</button>
            <button>Completed</button>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Player</th>
                <th>Amount</th>
                <th>Account age</th>
                <th>Completion history</th>
                <th>Risk</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>tester10</strong>
                  <small>Trusted Tester</small>
                </td>
                <td>
                  <strong>$20.00</strong>
                  <small>Mock payout ·•• 2841</small>
                </td>
                <td>96 days</td>
                <td>18 complete · 3% rejected</td>
                <td>
                  <Badge tone="success">LOW</Badge>
                </td>
                <td>
                  <StatusChip status="UNDER_REVIEW" />
                </td>
                <td>
                  <Button variant="secondary" onClick={() => setReviewing(true)}>
                    Review
                  </Button>
                </td>
              </tr>
              <tr>
                <td>
                  <strong>tester14</strong>
                  <small>Verified Tester</small>
                </td>
                <td>
                  <strong>$18.00</strong>
                  <small>Mock payout ·•• 7302</small>
                </td>
                <td>21 days</td>
                <td>7 complete · 8% rejected</td>
                <td>
                  <Badge tone="warning">REVIEW</Badge>
                </td>
                <td>
                  <StatusChip status="REQUESTED" />
                </td>
                <td>
                  <Button variant="secondary">Review</Button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
      {reviewing && (
        <Modal title="Review withdrawal" onClose={() => setReviewing(false)}>
          <div className="modal__body">
            <div className="withdrawal-review-header">
              <span className="avatar avatar--large">T1</span>
              <div>
                <h3>tester10</h3>
                <p>Trusted Tester · Account age 96 days</p>
              </div>
              <strong>$20.00</strong>
            </div>
            <div className="review-grid">
              <Card>
                <h3>Account context</h3>
                <dl>
                  <div>
                    <dt>Verified completions</dt>
                    <dd>18</dd>
                  </div>
                  <div>
                    <dt>Rejection rate</dt>
                    <dd>3%</dd>
                  </div>
                  <div>
                    <dt>Prior withdrawals</dt>
                    <dd>1 paid</dd>
                  </div>
                  <div>
                    <dt>Risk summary</dt>
                    <dd>
                      <Badge tone="success">Low</Badge>
                    </dd>
                  </div>
                </dl>
              </Card>
              <Card>
                <h3>Payout context</h3>
                <dl>
                  <div>
                    <dt>Provider</dt>
                    <dd>Mock payout</dd>
                  </div>
                  <div>
                    <dt>Destination</dt>
                    <dd>•••• 2841</dd>
                  </div>
                  <div>
                    <dt>Estimated fee</dt>
                    <dd>$0.50</dd>
                  </div>
                  <div>
                    <dt>Final paid</dt>
                    <dd>$19.50</dd>
                  </div>
                </dl>
              </Card>
            </div>
            <label>
              Internal note
              <textarea rows={3} placeholder="Required for rejection or escalation…" />
            </label>
          </div>
          <div className="modal__footer">
            <Button variant="danger" onClick={() => setReviewing(false)}>
              Reject
            </Button>
            <Button variant="secondary">Escalate</Button>
            <Button onClick={() => setReviewing(false)}>
              <Check /> Approve
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}

export function AdminGenericPage({
  title,
  description,
  type = "generic",
}: {
  title: string;
  description: string;
  type?: string;
}) {
  return (
    <>
      <AdminHeading
        title={title}
        description={description}
        action={<Button variant="secondary">Export view</Button>}
      />
      <Card className="data-card">
        <div className="data-card__header">
          <div>
            <h2>{title}</h2>
            <p>Restricted internal view with pagination, filters, and audit coverage.</p>
          </div>
          <label className="table-search">
            <Search />
            <input placeholder={`Search ${title.toLowerCase()}…`} />
          </label>
        </div>
        <AdminTable type={type} />
      </Card>
    </>
  );
}

function AdminTable({ type }: { type: string }) {
  if (type === "ledger")
    return (
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>User</th>
              <th>System</th>
              <th>Type</th>
              <th>Reference</th>
              <th>Amount</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {[
              [
                "txn_4k8…",
                "tester10",
                "Earnings",
                "MILESTONE_REWARD",
                "completion_91…",
                "+$1.25",
                "2m ago",
              ],
              [
                "txn_72a…",
                "owner1",
                "Campaign credits",
                "SPENT",
                "campaign_04…",
                "-$42.00",
                "16m ago",
              ],
              [
                "txn_9cc…",
                "tester7",
                "Sparks",
                "COSMETIC_PURCHASE",
                "moss-frame",
                "-2,200",
                "41m ago",
              ],
            ].map((row) => (
              <tr key={row[0]}>
                {row.map((cell, i) => (
                  <td key={cell}>
                    {i === 5 ? (
                      <strong className={cell.startsWith("+") ? "positive" : ""}>{cell}</strong>
                    ) : (
                      cell
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  if (type === "audit")
    return (
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Actor</th>
              <th>Action</th>
              <th>Entity</th>
              <th>Reason</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {[
              [
                "moderator1",
                "CAMPAIGN_APPROVED",
                "Campaign · Arcane academy",
                "Validation passed",
                "6m ago",
              ],
              ["nortixadmin", "USER_LIMITED", "User · tester16", "Risk review", "32m ago"],
              [
                "moderator2",
                "WITHDRAWAL_APPROVED",
                "Withdrawal · $20.00",
                "Standard checks passed",
                "1h ago",
              ],
            ].map((row) => (
              <tr key={row.join("-")}>
                {row.map((cell, i) => (
                  <td key={cell}>{i === 1 ? <code>{cell}</code> : cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Subject</th>
            <th>Type</th>
            <th>Status</th>
            <th>Risk / priority</th>
            <th>Updated</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {[
            ["Skyblock X", "Server", "APPROVED", "Low", "8m ago"],
            ["tester12", "User", "UNDER_REVIEW", "Medium", "32m ago"],
            ["Season launch test", "Campaign", "SUBMITTED", "Low", "2h ago"],
            ["Case #NTX-1042", "Report", "OPEN", "High", "3h ago"],
          ].map((row) => (
            <tr key={row[0]}>
              <td>
                <strong>{row[0]}</strong>
              </td>
              <td>{row[1]}</td>
              <td>
                <StatusChip status={row[2]!} />
              </td>
              <td>
                <Badge
                  tone={row[3] === "High" ? "danger" : row[3] === "Medium" ? "warning" : "success"}
                >
                  {row[3]}
                </Badge>
              </td>
              <td>{row[4]}</td>
              <td>
                <button className="icon-button">
                  <ChevronRight />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
