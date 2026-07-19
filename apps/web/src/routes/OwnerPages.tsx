import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Check,
  ChevronRight,
  Clock3,
  Code2,
  Copy,
  CreditCard,
  Gamepad2,
  KeyRound,
  LineChart,
  Plus,
  Radio,
  Server as ServerIcon,
  Settings,
  ShieldCheck,
  Target,
  Users,
  WalletCards,
} from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Badge, Button, Card, ProgressBar, StatusChip } from "@nortix/ui";
import { campaigns, servers } from "../features/demo-data";

const OwnerHeading = ({
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
      <span className="eyebrow">SERVER OWNER</span>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
    {action}
  </div>
);

export function OwnerDashboardPage() {
  return (
    <div className="dashboard-page owner-page">
      <OwnerHeading
        title="Owner Dashboard"
        description="Monitor campaigns, participation, feedback, and promotional usage."
        action={
          <div className="heading-actions">
            <Link className="button button--secondary" to="/owner/servers/new">
              <ServerIcon /> Add server
            </Link>
            <Link className="button button--primary" to="/owner/campaigns/new">
              <Plus /> Create campaign
            </Link>
          </div>
        }
      />
      <Card className="owner-server-switcher">
        <div className="server-inline">
          <span className="server-inline__logo server-art--0">SX</span>
          <div>
            <strong>
              Skyblock X <Badge tone="success">Verified</Badge>
            </strong>
            <small>Java · play.skyblock-x.example</small>
          </div>
        </div>
        <button className="button button--secondary">
          Switch server <ChevronRight />
        </button>
      </Card>
      <div className="quick-stats">
        <Card>
          <span className="stat-icon stat-icon--green">
            <Radio />
          </span>
          <div>
            <small>Active campaigns</small>
            <strong>2</strong>
            <span>284 total participants</span>
          </div>
        </Card>
        <Card>
          <span className="stat-icon stat-icon--blue">
            <Users />
          </span>
          <div>
            <small>Active participants</small>
            <strong>148</strong>
            <span className="positive">↑ 12% this week</span>
          </div>
        </Card>
        <Card>
          <span className="stat-icon stat-icon--purple">
            <Target />
          </span>
          <div>
            <small>Completion rate</small>
            <strong>61.3%</strong>
            <span>Across published campaigns</span>
          </div>
        </Card>
        <Card>
          <span className="stat-icon stat-icon--gold">
            <WalletCards />
          </span>
          <div>
            <small>Campaign balance</small>
            <strong>$385.00</strong>
            <span>$150 promotional</span>
          </div>
        </Card>
      </div>
      <div className="owner-grid">
        <Card className="data-card">
          <div className="data-card__header">
            <div>
              <h2>Milestone funnel</h2>
              <p>First island experience · Last 14 days</p>
            </div>
            <button className="button button--ghost">View analytics</button>
          </div>
          <div className="owner-funnel">
            {(
              [
                ["Campaign views", 2840, 100],
                ["Playtest joins", 684, 72],
                ["Server connects", 593, 58],
                ["Tutorial completes", 419, 41],
                ["Feedback submits", 286, 28],
              ] as const
            ).map(([label, count, width]) => (
              <div key={label}>
                <span>
                  {label}
                  <b>{count.toLocaleString()}</b>
                </span>
                <i>
                  <em style={{ width: `${width}%` }} />
                </i>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <div className="data-card__header">
            <div>
              <h2>Feedback pulse</h2>
              <p>From 286 verified responses</p>
            </div>
            <Badge tone="success">4.6 / 5</Badge>
          </div>
          <div className="feedback-scores">
            {[
              ["Onboarding clarity", 82],
              ["Gameplay clarity", 76],
              ["Performance", 91],
              ["Likelihood to return", 68],
            ].map(([label, value]) => (
              <div key={label}>
                <span>
                  {label}
                  <b>{value}%</b>
                </span>
                <ProgressBar value={Number(value)} />
              </div>
            ))}
          </div>
          <div className="theme-chips">
            <span>Clear island goals</span>
            <span>Helpful starter guide</span>
            <span className="warning">Upgrade menu confusion</span>
          </div>
        </Card>
      </div>
      <Card className="data-card">
        <div className="data-card__header">
          <div>
            <h2>Campaigns</h2>
            <p>Current and recent server-growth playtests.</p>
          </div>
          <Link to="/owner/campaigns/new">
            Create campaign <ArrowRight />
          </Link>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Campaign</th>
                <th>Status</th>
                <th>Participants</th>
                <th>Completion</th>
                <th>Usage</th>
                <th>Schedule</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.slice(0, 4).map((campaign, index) => (
                <tr key={campaign.id}>
                  <td>
                    <strong>{campaign.title}</strong>
                    <small>{campaign.server.name}</small>
                  </td>
                  <td>
                    <StatusChip
                      status={index < 2 ? "ACTIVE" : index === 2 ? "UNDER_REVIEW" : "COMPLETED"}
                    />
                  </td>
                  <td>{campaign.participants}</td>
                  <td>{61 - index * 7}%</td>
                  <td>${(112 + index * 23).toFixed(2)}</td>
                  <td>{index < 2 ? "Ends in 18 days" : "Jul 2 – Jul 16"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Card className="data-card">
        <div className="data-card__header">
          <div>
            <h2>Moderation actions</h2>
            <p>Items that need your attention.</p>
          </div>
        </div>
        <div className="moderation-actions">
          <div>
            <AlertTriangle />
            <span>
              <strong>Campaign changes requested</strong>
              <small>Clarify screenshot evidence for “Complete tutorial.”</small>
            </span>
            <button className="button button--secondary">Review changes</button>
          </div>
          <div>
            <Clock3 />
            <span>
              <strong>3 disputed completions</strong>
              <small>Add server-side context before moderator review.</small>
            </span>
            <button className="button button--secondary">Open disputes</button>
          </div>
        </div>
      </Card>
    </div>
  );
}

export function ServerOnboardingPage() {
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  if (done)
    return (
      <div className="dashboard-page">
        <Card className="success-panel">
          <ShieldCheck />
          <Badge tone="warning">REVIEW PENDING</Badge>
          <h1>Ownership evidence submitted.</h1>
          <p>
            Your server profile is saved. A moderator will review the hostname and ownership
            evidence before campaigns can be submitted for launch.
          </p>
          <div>
            <Link className="button button--primary" to="/owner/campaigns/new">
              Create a draft campaign
            </Link>
            <Link className="button button--secondary" to="/owner">
              Owner dashboard
            </Link>
          </div>
        </Card>
      </div>
    );
  const steps = ["Server details", "Ownership evidence", "Review"];
  return (
    <div className="dashboard-page wizard-page">
      <OwnerHeading
        title="Add a Minecraft Server"
        description="Create a public server profile and submit ownership evidence for manual review."
      />
      <div className="wizard-progress">
        {steps.map((label, index) => (
          <button
            className={index === step ? "active" : index < step ? "complete" : ""}
            key={label}
          >
            <span>{index < step ? <Check /> : index + 1}</span>
            <small>{label}</small>
          </button>
        ))}
      </div>
      <Card className="wizard-card">
        {step === 0 && (
          <>
            <div className="wizard-heading">
              <span className="eyebrow">SERVER PROFILE</span>
              <h2>Tell players what your server offers.</h2>
              <p>Connection secrets are never part of the public profile.</p>
            </div>
            <div className="form-grid form-grid--two">
              <label>
                Server name
                <input aria-label="Server name" defaultValue="Northwind Survival" />
              </label>
              <label>
                Edition
                <select aria-label="Edition">
                  <option>Java</option>
                  <option>Bedrock</option>
                </select>
              </label>
              <label>
                Hostname
                <input aria-label="Hostname" defaultValue="play.northwind.example" />
              </label>
              <label>
                Port
                <input aria-label="Port" type="number" defaultValue="25565" />
              </label>
              <label>
                Supported versions
                <input defaultValue="1.20.4, 1.21" />
              </label>
              <label>
                Categories
                <input defaultValue="Survival, Community" />
              </label>
              <label className="span-two">
                Description
                <textarea
                  rows={5}
                  defaultValue="A welcoming survival community with guided expeditions, fair progression, and player-led building projects."
                />
              </label>
            </div>
          </>
        )}
        {step === 1 && (
          <>
            <div className="wizard-heading">
              <span className="eyebrow">MANUAL VERIFICATION</span>
              <h2>Show that you control this server.</h2>
              <p>
                For the MVP, moderators review concise ownership evidence. Automated DNS, MOTD,
                plugin, and website methods can replace this adapter later.
              </p>
            </div>
            <div className="evidence-options">
              <label className="selected">
                <input type="radio" name="evidence" defaultChecked />
                <ShieldCheck />
                <span>
                  <strong>Server console evidence</strong>
                  <small>
                    Provide a screenshot showing the hostname and a generated challenge token.
                  </small>
                </span>
              </label>
              <label>
                <input type="radio" name="evidence" />
                <Code2 />
                <span>
                  <strong>Website ownership evidence</strong>
                  <small>Reference a page on the server’s official website.</small>
                </span>
              </label>
            </div>
            <label>
              Evidence note
              <textarea
                aria-label="Evidence note"
                rows={4}
                defaultValue="I control the server console and can respond to verification follow-up at the account email."
              />
            </label>
            <label className="upload-placeholder">
              <input type="file" />
              <span>
                <ShieldCheck /> Attach evidence image (prototype placeholder)
              </span>
            </label>
          </>
        )}
        {step === 2 && (
          <>
            <div className="wizard-heading">
              <span className="eyebrow">CONFIRM</span>
              <h2>Review your verification request.</h2>
              <p>The public listing stays hidden until ownership and moderation checks pass.</p>
            </div>
            <div className="review-grid">
              <Card>
                <h3>Server</h3>
                <dl>
                  <div>
                    <dt>Name</dt>
                    <dd>Northwind Survival</dd>
                  </div>
                  <div>
                    <dt>Edition</dt>
                    <dd>Java</dd>
                  </div>
                  <div>
                    <dt>Hostname</dt>
                    <dd>play.northwind.example</dd>
                  </div>
                  <div>
                    <dt>Versions</dt>
                    <dd>1.20.4, 1.21</dd>
                  </div>
                </dl>
              </Card>
              <Card>
                <h3>Verification</h3>
                <dl>
                  <div>
                    <dt>Provider</dt>
                    <dd>Manual review</dd>
                  </div>
                  <div>
                    <dt>Evidence</dt>
                    <dd>Console screenshot</dd>
                  </div>
                  <div>
                    <dt>Listing state</dt>
                    <dd>Hidden pending review</dd>
                  </div>
                  <div>
                    <dt>Expected response</dt>
                    <dd>1–2 business days</dd>
                  </div>
                </dl>
              </Card>
            </div>
            <label className="checkbox-row">
              <input type="checkbox" defaultChecked />
              <span>
                I confirm I am authorized to represent this server and the submitted details are
                accurate.
              </span>
            </label>
          </>
        )}
        <div className="wizard-footer">
          <Button variant="ghost" onClick={() => (step === 0 ? history.back() : setStep(step - 1))}>
            <ArrowLeft /> {step === 0 ? "Cancel" : "Back"}
          </Button>
          <span>Draft saved</span>
          <Button onClick={() => (step === 2 ? setDone(true) : setStep(step + 1))}>
            {step === 2 ? "Submit ownership evidence" : "Continue"} <ArrowRight />
          </Button>
        </div>
      </Card>
    </div>
  );
}

const wizardSteps = [
  "Server",
  "Objective",
  "Audience",
  "Milestones",
  "Capacity",
  "Schedule",
  "Review",
];

export function CampaignWizardPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [selectedServer, setSelectedServer] = useState("server-1");
  const [objective, setObjective] = useState("ONBOARDING");
  const [milestones, setMilestones] = useState([
    "Join server",
    "Complete tutorial",
    "Submit feedback",
  ]);
  const [submitted, setSubmitted] = useState(false);
  const next = () => setStep((value) => Math.min(wizardSteps.length - 1, value + 1));
  const back = () => setStep((value) => Math.max(0, value - 1));
  if (submitted)
    return (
      <div className="dashboard-page">
        <Card className="success-panel">
          <ShieldCheck />
          <Badge tone="success">SUBMITTED</Badge>
          <h1>Campaign sent for review.</h1>
          <p>
            Moderators will check milestone clarity, reward ranges, expected duration, verification,
            and abuse risks before publication.
          </p>
          <div>
            <Button onClick={() => navigate("/owner")}>Return to owner dashboard</Button>
            <Button
              variant="secondary"
              onClick={() => {
                setSubmitted(false);
                setStep(0);
              }}
            >
              Create another
            </Button>
          </div>
        </Card>
      </div>
    );
  return (
    <div className="dashboard-page wizard-page">
      <OwnerHeading
        title="Create Campaign"
        description="Build a moderated playtest from approved milestone templates."
      />
      <div className="wizard-progress">
        {wizardSteps.map((label, index) => (
          <button
            key={label}
            className={index === step ? "active" : index < step ? "complete" : ""}
            onClick={() => index <= step && setStep(index)}
          >
            <span>{index < step ? <Check /> : index + 1}</span>
            <small>{label}</small>
          </button>
        ))}
      </div>
      <Card className="wizard-card">
        {step === 0 && (
          <>
            <div className="wizard-heading">
              <span className="eyebrow">STEP 1 OF 7</span>
              <h2>Select a verified server</h2>
              <p>Campaigns can only launch for servers whose ownership has been reviewed.</p>
            </div>
            <div className="select-grid">
              {servers.slice(0, 3).map((server) => (
                <button
                  className={selectedServer === server.id ? "selected" : ""}
                  onClick={() => setSelectedServer(server.id)}
                  key={server.id}
                >
                  <span className={`server-inline__logo server-art--${server.art}`}>
                    {server.name.slice(0, 2)}
                  </span>
                  <span>
                    <strong>{server.name}</strong>
                    <small>
                      {server.edition} · {server.versions.join(", ")}
                    </small>
                  </span>
                  <Badge tone={server.verified ? "success" : "warning"}>
                    {server.verified ? "Verified" : "Pending"}
                  </Badge>
                </button>
              ))}
            </div>
            <button className="add-server">
              <Plus /> Add another server
            </button>
          </>
        )}
        {step === 1 && (
          <>
            <div className="wizard-heading">
              <span className="eyebrow">STEP 2 OF 7</span>
              <h2>What do you want to learn?</h2>
              <p>Your objective shapes recommended milestone templates and analytics.</p>
            </div>
            <div className="objective-grid">
              {(
                [
                  [
                    "ONBOARDING",
                    "Improve onboarding",
                    "Find friction in the first 30–60 minutes.",
                    Target,
                  ],
                  [
                    "RETENTION",
                    "Understand return intent",
                    "Learn what makes players return another day.",
                    Users,
                  ],
                  [
                    "GAMEPLAY",
                    "Test a gameplay loop",
                    "Validate a quest, progression, or activity.",
                    Gamepad2,
                  ],
                  [
                    "PERFORMANCE",
                    "Find technical issues",
                    "Collect structured performance and bug reports.",
                    LineChart,
                  ],
                ] as const
              ).map(([id, title, desc, Icon]) => (
                <button
                  className={objective === id ? "selected" : ""}
                  onClick={() => setObjective(id)}
                  key={id}
                >
                  <Icon />
                  <strong>{title}</strong>
                  <small>{desc}</small>
                </button>
              ))}
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <div className="wizard-heading">
              <span className="eyebrow">STEP 3 OF 7</span>
              <h2>Choose your target audience</h2>
              <p>Eligibility rules are captured when each player joins.</p>
            </div>
            <div className="form-grid form-grid--two">
              <label>
                Minecraft edition
                <select>
                  <option>Java Edition</option>
                  <option>Bedrock Edition</option>
                </select>
              </label>
              <label>
                Required version
                <select>
                  <option>1.21</option>
                  <option>1.20.4</option>
                </select>
              </label>
              <label>
                Region
                <select>
                  <option>Worldwide</option>
                  <option>North America & UK</option>
                  <option>Europe</option>
                </select>
              </label>
              <label>
                Minimum reputation
                <select>
                  <option>Any verified player</option>
                  <option>Trusted Tester (500+)</option>
                  <option>Veteran Tester (800+)</option>
                </select>
              </label>
              <label>
                Language
                <select>
                  <option>English</option>
                  <option>German</option>
                  <option>Turkish</option>
                </select>
              </label>
              <label>
                Prior campaign rule
                <select>
                  <option>No prior completion required</option>
                  <option>At least 3 verified playtests</option>
                </select>
              </label>
            </div>
          </>
        )}
        {step === 3 && (
          <>
            <div className="wizard-heading">
              <span className="eyebrow">STEP 4 OF 7</span>
              <h2>Build the milestone path</h2>
              <p>Choose approved templates, then configure public instructions and verification.</p>
            </div>
            <div className="milestone-builder">
              {milestones.map((name, index) => (
                <div key={`${name}-${index}`}>
                  <span className="drag-handle">⋮⋮</span>
                  <span className="status-number">{index + 1}</span>
                  <div>
                    <strong>{name}</strong>
                    <small>
                      {index === 0
                        ? "Manual review · $0.50 · 150 Sparks"
                        : index === 1
                          ? "Manual review · $1.25 · 350 Sparks"
                          : "Web verification · $1.25 · 500 Sparks"}
                    </small>
                  </div>
                  <button
                    className="icon-button"
                    onClick={() =>
                      setMilestones(milestones.filter((_, itemIndex) => itemIndex !== index))
                    }
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                className="add-milestone"
                onClick={() =>
                  !milestones.includes("Return another day") &&
                  setMilestones([...milestones, "Return another day"])
                }
              >
                <Plus /> Add approved milestone
              </button>
            </div>
            <Card className="moderation-note">
              <ShieldCheck />
              <div>
                <strong>Nortix guardrails applied</strong>
                <p>
                  Reward ranges, duration limits, verification methods, and prohibited requirements
                  are validated before review.
                </p>
              </div>
            </Card>
          </>
        )}
        {step === 4 && (
          <>
            <div className="wizard-heading">
              <span className="eyebrow">STEP 5 OF 7</span>
              <h2>Configure participant capacity</h2>
              <p>Usage is estimated from capacity and approved milestone ranges.</p>
            </div>
            <div className="form-grid form-grid--two">
              <label>
                Maximum participants
                <input type="number" defaultValue="150" />
              </label>
              <label>
                Completions per player
                <input type="number" defaultValue="1" disabled />
              </label>
            </div>
            <Card className="usage-preview">
              <div>
                <span>Estimated campaign usage</span>
                <strong>$450.00</strong>
                <small>150 participants × $3.00 public reward</small>
              </div>
              <dl>
                <div>
                  <dt>Available campaign balance</dt>
                  <dd>$385.00</dd>
                </div>
                <div>
                  <dt>Additional balance needed</dt>
                  <dd>$65.00</dd>
                </div>
              </dl>
              <Link to="/owner/balance">Add campaign balance →</Link>
            </Card>
          </>
        )}
        {step === 5 && (
          <>
            <div className="wizard-heading">
              <span className="eyebrow">STEP 6 OF 7</span>
              <h2>Choose a schedule</h2>
              <p>Approved campaigns can launch immediately or start later.</p>
            </div>
            <div className="form-grid form-grid--two">
              <label>
                Start date
                <input type="date" defaultValue="2026-07-22" />
              </label>
              <label>
                End date
                <input type="date" defaultValue="2026-08-12" />
              </label>
              <label>
                Time zone
                <select>
                  <option>Europe/Istanbul (UTC+3)</option>
                </select>
              </label>
              <label>
                Launch behavior
                <select>
                  <option>Start automatically after approval</option>
                  <option>Wait for manual launch</option>
                </select>
              </label>
            </div>
          </>
        )}
        {step === 6 && (
          <>
            <div className="wizard-heading">
              <span className="eyebrow">STEP 7 OF 7</span>
              <h2>Review before moderation</h2>
              <p>
                Players will never see your campaign balance, internal cost, or Nortix business
                calculations.
              </p>
            </div>
            <div className="review-grid">
              <Card>
                <h3>Campaign</h3>
                <dl>
                  <div>
                    <dt>Server</dt>
                    <dd>Skyblock X</dd>
                  </div>
                  <div>
                    <dt>Objective</dt>
                    <dd>{objective.toLowerCase()}</dd>
                  </div>
                  <div>
                    <dt>Audience</dt>
                    <dd>Java 1.21 · Worldwide</dd>
                  </div>
                  <div>
                    <dt>Capacity</dt>
                    <dd>150 participants</dd>
                  </div>
                  <div>
                    <dt>Schedule</dt>
                    <dd>Jul 22 – Aug 12</dd>
                  </div>
                </dl>
              </Card>
              <Card>
                <h3>Milestones</h3>
                {milestones.map((name, index) => (
                  <span key={name}>
                    <b>{index + 1}</b>
                    {name}
                  </span>
                ))}
              </Card>
              <Card className="internal-preview">
                <Badge tone="warning">OWNER VIEW</Badge>
                <h3>Expected usage</h3>
                <strong>$450.00</strong>
                <p>Campaign balance is charged only according to the approved usage workflow.</p>
              </Card>
            </div>
            <label className="checkbox-row">
              <input type="checkbox" defaultChecked />
              <span>I confirm the server details, requirements, and schedule are accurate.</span>
            </label>
          </>
        )}
        <div className="wizard-footer">
          <Button variant="ghost" onClick={step === 0 ? () => navigate("/owner") : back}>
            <ArrowLeft /> {step === 0 ? "Cancel" : "Back"}
          </Button>
          <span>Draft saved locally</span>
          <Button onClick={step === wizardSteps.length - 1 ? () => setSubmitted(true) : next}>
            {step === wizardSteps.length - 1 ? "Submit for review" : "Continue"} <ArrowRight />
          </Button>
        </div>
      </Card>
    </div>
  );
}

export function OwnerAnalyticsPage() {
  return (
    <div className="dashboard-page owner-page">
      <OwnerHeading
        title="Analytics"
        description="Campaign funnels, sessions, return signals, and structured feedback."
        action={
          <div className="segmented">
            <button className="active">Last 30 days</button>
            <button>90 days</button>
          </div>
        }
      />
      <Card className="insufficient-banner">
        <AlertTriangle />
        <div>
          <strong>Retention estimates need more data.</strong>
          <p>
            Day-7 return will appear after enough eligible participants reach the observation
            window.
          </p>
        </div>
        <Badge tone="warning">Insufficient data</Badge>
      </Card>
      <div className="quick-stats">
        <Card>
          <span className="stat-icon stat-icon--blue">
            <BarChart3 />
          </span>
          <div>
            <small>Campaign views</small>
            <strong>5,842</strong>
            <span className="positive">↑ 14.2%</span>
          </div>
        </Card>
        <Card>
          <span className="stat-icon stat-icon--green">
            <Users />
          </span>
          <div>
            <small>Campaign joins</small>
            <strong>1,284</strong>
            <span>22.0% view-to-join</span>
          </div>
        </Card>
        <Card>
          <span className="stat-icon stat-icon--purple">
            <Clock3 />
          </span>
          <div>
            <small>Average active session</small>
            <strong>47m</strong>
            <span>Manual + web events</span>
          </div>
        </Card>
        <Card>
          <span className="stat-icon stat-icon--gold">
            <Target />
          </span>
          <div>
            <small>Recommendation score</small>
            <strong>8.2</strong>
            <span>286 responses</span>
          </div>
        </Card>
      </div>
      <div className="owner-grid">
        <Card className="chart-card">
          <div className="data-card__header">
            <div>
              <h2>Campaign activity</h2>
              <p>Views, joins, and milestone completions.</p>
            </div>
            <div className="legend">
              <span className="legend-green">Joins</span>
              <span className="legend-purple">Completions</span>
            </div>
          </div>
          <div className="line-chart">
            <span className="grid-line" />
            <span className="grid-line" />
            <span className="grid-line" />
            <div className="chart-bars">
              {[42, 58, 49, 72, 64, 89, 77, 95, 82, 68, 91, 86].map((height, i) => (
                <div key={i}>
                  <i style={{ height: `${height}%` }} />
                  <em style={{ height: `${height * 0.68}%` }} />
                </div>
              ))}
            </div>
          </div>
        </Card>
        <Card>
          <h2>Drop-off by milestone</h2>
          <div className="dropoff-list">
            {[
              ["Joined campaign", 100],
              ["Connected to server", 86.7],
              ["Completed tutorial", 61.3],
              ["Submitted feedback", 41.8],
            ].map(([label, value], index) => (
              <div key={label}>
                <span>
                  <b>{index + 1}</b>
                  {label}
                  <strong>{value}%</strong>
                </span>
                <ProgressBar value={Number(value)} />
              </div>
            ))}
          </div>
        </Card>
      </div>
      <Card className="data-card">
        <div className="data-card__header">
          <div>
            <h2>Feedback themes</h2>
            <p>Prepared for future assisted summaries; currently based on manual tags.</p>
          </div>
        </div>
        <div className="feedback-theme-grid">
          {[
            ["Positive", "Clear island objectives", 84],
            ["Positive", "Friendly starter community", 69],
            ["Needs attention", "Upgrade menu terminology", 41],
            ["Needs attention", "Tutorial pacing", 28],
          ].map(([tone, label, count]) => (
            <div key={label}>
              <Badge tone={tone === "Positive" ? "success" : "warning"}>{tone}</Badge>
              <strong>{label}</strong>
              <span>{count} mentions</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export function CampaignBalancePage() {
  return (
    <div className="dashboard-page owner-page">
      <OwnerHeading
        title="Campaign Balance"
        description="Purchased and promotional campaign credits for approved campaigns."
        action={
          <Button>
            <CreditCard /> Add balance
          </Button>
        }
      />
      <div className="balance-overview">
        <Card>
          <span>Campaign balance</span>
          <strong>$385.00</strong>
          <small>Available for approved campaign usage</small>
        </Card>
        <Card>
          <span>Purchased credits</span>
          <strong>$235.00</strong>
          <small>Subject to payment and refund terms</small>
        </Card>
        <Card className="promotional-card">
          <span>Promotional credits</span>
          <strong>$150.00</strong>
          <small>$75 expires Sep 1, 2026</small>
        </Card>
      </div>
      <Card className="promotional-notice">
        <ShieldCheck />
        <div>
          <h3>Promotional credits are separate.</h3>
          <p>
            They are non-refundable, non-transferable, cannot be withdrawn, may expire, and can only
            fund approved campaigns.
          </p>
        </div>
      </Card>
      <Card className="data-card">
        <div className="data-card__header">
          <div>
            <h2>Balance activity</h2>
            <p>Purchased, promotional, spent, expired, and adjusted campaign credits.</p>
          </div>
          <button className="button button--secondary">Download statement</button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Type</th>
                <th>Date</th>
                <th>Expires</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Summer campaign purchase", "Purchased credits", "Jul 15", "—", "+$200.00"],
                ["Early owner launch grant", "Promotional credits", "Jul 1", "Sep 1", "+$150.00"],
                ["First island experience", "Campaign usage", "Jul 18", "—", "-$42.00"],
                ["Prison onboarding polish", "Campaign usage", "Jul 17", "—", "-$23.00"],
              ].map((row) => (
                <tr key={row[0]}>
                  {row.map((cell, index) => (
                    <td
                      key={cell}
                      className={index === 4 && cell.startsWith("+") ? "positive" : ""}
                    >
                      {index === 0 ? <strong>{cell}</strong> : cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

export function IntegrationsPage() {
  return (
    <div className="dashboard-page owner-page">
      <OwnerHeading
        title="Integrations"
        description="Prepare signed event sources for server verification and campaign analytics."
        action={
          <Button>
            <Plus /> Create API key
          </Button>
        }
      />
      <Card className="integration-coming">
        <Gamepad2 />
        <div>
          <Badge tone="purple">COMING LATER</Badge>
          <h2>Nortix Minecraft plugin</h2>
          <p>
            Automatic join, active-playtime, tutorial, region, level, quest, boss, and return-event
            verification will connect here without changing campaign logic.
          </p>
        </div>
        <button className="button button--secondary" disabled>
          Download unavailable
        </button>
      </Card>
      <div className="integration-grid">
        <Card>
          <Radio />
          <h3>Server event API</h3>
          <p>Submit signed, idempotent events from custom server tooling.</p>
          <dl>
            <div>
              <dt>Status</dt>
              <dd>
                <Badge tone="success">Ready</Badge>
              </dd>
            </div>
            <div>
              <dt>Scopes</dt>
              <dd>events:write</dd>
            </div>
            <div>
              <dt>Last event</dt>
              <dd>Never</dd>
            </div>
          </dl>
          <button className="button button--secondary">View documentation</button>
        </Card>
        <Card>
          <Code2 />
          <h3>Manual event import</h3>
          <p>Upload development events while the Minecraft plugin is unavailable.</p>
          <dl>
            <div>
              <dt>Formats</dt>
              <dd>JSON, CSV</dd>
            </div>
            <div>
              <dt>Validation</dt>
              <dd>Schema + timestamps</dd>
            </div>
            <div>
              <dt>Audit log</dt>
              <dd>Enabled</dd>
            </div>
          </dl>
          <button className="button button--secondary">Open importer</button>
        </Card>
        <Card>
          <KeyRound />
          <h3>API keys</h3>
          <p>Rotating, scoped keys with replay protection and server ownership checks.</p>
          <dl>
            <div>
              <dt>Active keys</dt>
              <dd>1</dd>
            </div>
            <div>
              <dt>Last four</dt>
              <dd>•••• 72F1</dd>
            </div>
            <div>
              <dt>Rotation</dt>
              <dd>Recommended</dd>
            </div>
          </dl>
          <button className="button button--secondary">Manage keys</button>
        </Card>
      </div>
      <Card className="endpoint-card">
        <div className="data-card__header">
          <div>
            <h2>Integration endpoints</h2>
            <p>
              All writes require signatures, timestamps, idempotency keys, scopes, and rate limits.
            </p>
          </div>
        </div>
        {[
          ["POST", "/v1/integrations/server/events"],
          ["POST", "/v1/integrations/client/events"],
          ["POST", "/v1/integrations/verify"],
          ["GET", "/v1/integrations/campaigns/:campaignId/config"],
          ["POST", "/v1/integrations/milestones/:milestoneId/complete"],
        ].map(([method, path]) => (
          <div key={path}>
            <Badge tone={method === "GET" ? "info" : "success"}>{method}</Badge>
            <code>{path}</code>
            <button className="icon-button">
              <Copy />
            </button>
          </div>
        ))}
      </Card>
    </div>
  );
}

export function OwnerSettingsPage() {
  return (
    <div className="dashboard-page owner-page">
      <OwnerHeading
        title="Owner Settings"
        description="Manage server details, ownership evidence, notification preferences, and team access."
      />
      <div className="settings-layout">
        <nav>
          {[
            "Server profile",
            "Ownership verification",
            "Notifications",
            "Team access",
            "Campaign defaults",
            "Danger zone",
          ].map((item, index) => (
            <button className={index === 0 ? "active" : ""} key={item}>
              <Settings />
              {item}
            </button>
          ))}
        </nav>
        <Card>
          <h2>Server profile</h2>
          <p>Public information for Skyblock X. Connection secrets are never displayed here.</p>
          <form className="form-grid form-grid--two">
            <label>
              Server name
              <input defaultValue="Skyblock X" />
            </label>
            <label>
              Hostname
              <input defaultValue="play.skyblock-x.example" />
            </label>
            <label className="span-two">
              Description
              <textarea
                rows={5}
                defaultValue="Build a floating empire with evolving islands, co-op challenges, and a friendly economy."
              />
            </label>
            <label>
              Minecraft edition
              <select>
                <option>Java</option>
              </select>
            </label>
            <label>
              Supported versions
              <input defaultValue="1.20.4, 1.21" />
            </label>
            <label>
              Website URL
              <input defaultValue="https://skyblock-x.example" />
            </label>
            <label>
              Discord URL
              <input defaultValue="https://discord.gg/skyblock-x" />
            </label>
            <div className="span-two form-actions">
              <Button>Save changes</Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
