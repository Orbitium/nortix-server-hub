import {
  ArrowRight,
  Check,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Compass,
  Copy,
  Download,
  Flame,
  Gamepad2,
  Gift,
  Globe2,
  Heart,
  History,
  LockKeyhole,
  MessageSquareText,
  MoreHorizontal,
  Palette,
  Search,
  Target,
  Settings,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Users,
  WalletCards,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Badge, Button, Card, ProgressBar, Sparks, StatusChip } from "@nortix/ui";
import { CampaignCard } from "../components/CampaignCard";
import { Modal } from "../components/Modal";
import { ServerCard } from "../components/ServerCard";
import { ReferenceDashboardHome } from "../components/ReferenceDashboardHome";
import { campaigns, cosmetics, leaderboard, servers } from "../features/demo-data";

const PageHeading = ({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) => (
  <div className="dashboard-heading">
    <div>
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h1>{title}</h1>
      {description && <p>{description}</p>}
    </div>
    {action}
  </div>
);

export function DashboardHomePage() {
  return <ReferenceDashboardHome />;
}

export function LegacyDashboardHomePage() {
  return (
    <div className="dashboard-page">
      <PageHeading
        eyebrow="SUNDAY, JULY 19"
        title="Ready for your next signal, Quartz?"
        description="Three campaigns match your version, region, and tester reputation."
        action={
          <Link className="button button--primary" to="/dashboard/campaigns">
            Browse campaigns <ArrowRight />
          </Link>
        }
      />
      <section className="dashboard-feature">
        <div className="dashboard-feature__copy">
          <Badge tone="purple">Recommended playtest</Badge>
          <h2>Help Arcane Realms refine its academy onboarding.</h2>
          <p>
            Test spell selection, complete the first quest, and share feedback on clarity and
            pacing.
          </p>
          <div className="dashboard-feature__meta">
            <span>
              <Clock3 /> 55–75 min
            </span>
            <span>
              <Globe2 /> Worldwide
            </span>
            <span>
              <ShieldCheck /> Verified server
            </span>
          </div>
          <div className="dashboard-feature__reward">
            <div>
              <small>Available reward</small>
              <strong>$4.60</strong>
            </div>
            <Sparks value="1,600 Sparks" />
            <Link className="button button--primary" to="/campaigns/campaign-5">
              View playtest
            </Link>
          </div>
        </div>
        <div className="dashboard-feature__art server-art--4">
          <span className="rune rune--1">✦</span>
          <span className="rune rune--2">◆</span>
          <span className="rune rune--3">✧</span>
          <div className="feature-tower" />
        </div>
      </section>
      <div className="quick-stats">
        <Card>
          <span className="stat-icon stat-icon--green">
            <Gamepad2 />
          </span>
          <div>
            <small>Active playtests</small>
            <strong>2</strong>
            <span>4 milestones remaining</span>
          </div>
        </Card>
        <Card>
          <span className="stat-icon stat-icon--gold">
            <CircleDollarSign />
          </span>
          <div>
            <small>Pending verification</small>
            <strong>$4.60</strong>
            <span>2 submissions in review</span>
          </div>
        </Card>
        <Card>
          <span className="stat-icon stat-icon--purple">
            <Sparkles />
          </span>
          <div>
            <small>Sparks this week</small>
            <strong>1,280</strong>
            <span className="positive">↑ 18% from last week</span>
          </div>
        </Card>
        <Card>
          <span className="stat-icon stat-icon--blue">
            <ShieldCheck />
          </span>
          <div>
            <small>Tester reputation</small>
            <strong>854</strong>
            <span>Trusted Tester · Top 12%</span>
          </div>
        </Card>
      </div>
      <section>
        <div className="section-heading">
          <div>
            <h2>Continue your playtests</h2>
            <p>Pick up where you left off.</p>
          </div>
          <Link to="/dashboard/progress">
            All progress <ArrowRight />
          </Link>
        </div>
        <div className="progress-campaigns">
          <Card>
            <div className="progress-campaign__top">
              <span className="server-inline__logo server-art--0">SX</span>
              <div>
                <strong>First island experience</strong>
                <small>Skyblock X · Milestone 2 of 3</small>
              </div>
              <StatusChip status="ACTIVE" />
            </div>
            <ProgressBar value={58} label="Tutorial completion evidence due" />
            <div className="progress-campaign__footer">
              <span>
                <Clock3 /> Last active 42 min ago
              </span>
              <Link className="button button--secondary button--small" to="/dashboard/progress">
                Continue
              </Link>
            </div>
          </Card>
          <Card>
            <div className="progress-campaign__top">
              <span className="server-inline__logo server-art--7">VF</span>
              <div>
                <strong>New frontier expedition</strong>
                <small>Vanilla Frontier · Milestone 1 of 3</small>
              </div>
              <Badge tone="warning">PENDING</Badge>
            </div>
            <ProgressBar value={26} label="Connection evidence under review" />
            <div className="progress-campaign__footer">
              <span>
                <Clock3 /> Submitted yesterday
              </span>
              <Link className="button button--secondary button--small" to="/dashboard/progress">
                View
              </Link>
            </div>
          </Card>
        </div>
      </section>
      <section>
        <div className="section-heading">
          <div>
            <h2>Matched for you</h2>
            <p>Based on your Minecraft version and tester history.</p>
          </div>
          <Link to="/dashboard/campaigns">
            Browse all <ArrowRight />
          </Link>
        </div>
        <div className="campaign-grid">
          {campaigns.slice(1, 4).map((campaign) => (
            <CampaignCard campaign={campaign} key={campaign.id} />
          ))}
        </div>
      </section>
    </div>
  );
}

export function DashboardServersPage() {
  const [search, setSearch] = useState("");
  const filtered = servers.filter((server) =>
    `${server.name} ${server.categories.join(" ")}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <div className="dashboard-page">
      <PageHeading
        title="Servers"
        description="Explore verified Minecraft communities across Java and Bedrock."
      />
      <div className="dashboard-filter">
        <label>
          <Search />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search servers"
          />
        </label>
        <button className="button button--secondary">All categories</button>
        <button className="button button--secondary">All editions</button>
      </div>
      <div className="server-grid">
        {filtered.map((server) => (
          <ServerCard server={server} key={server.id} />
        ))}
      </div>
    </div>
  );
}

export function DashboardCampaignsPage() {
  const [tab, setTab] = useState("Recommended");
  return (
    <div className="dashboard-page">
      <PageHeading
        title="Campaigns"
        description="Explore optional playtests that may provide Sparks after verification."
      />
      <div className="tabs">
        {["Recommended", "Newest", "Highest Sparks limit", "Short sessions"].map((item) => (
          <button className={tab === item ? "active" : ""} onClick={() => setTab(item)} key={item}>
            {item}
          </button>
        ))}
      </div>
      <div className="campaign-grid">
        {campaigns.map((campaign) => (
          <CampaignCard campaign={campaign} key={campaign.id} />
        ))}
      </div>
    </div>
  );
}

export function ProgressPage() {
  const [tab, setTab] = useState("Active");
  return (
    <div className="dashboard-page">
      <PageHeading
        title="My Progress"
        description="Track milestones, reviews, feedback, and potential Sparks."
      />
      <div className="summary-strip">
        <span>
          <small>Active campaigns</small>
          <strong>2</strong>
        </span>
        <span>
          <small>Completed</small>
          <strong>14</strong>
        </span>
        <span>
          <small>Potential Sparks</small>
          <strong>Up to 100</strong>
        </span>
        <span>
          <small>Verified Sparks</small>
          <strong>18,240</strong>
        </span>
      </div>
      <div className="tabs">
        {["Active", "Under review", "Completed", "History"].map((item) => (
          <button className={tab === item ? "active" : ""} onClick={() => setTab(item)} key={item}>
            {item}
          </button>
        ))}
      </div>
      <div className="progress-layout">
        <Card className="progress-detail">
          <div className="progress-detail__header">
            <span className="server-inline__logo server-art--0">SX</span>
            <div>
              <h2>First island experience</h2>
              <p>Skyblock X · Joined July 17</p>
            </div>
            <StatusChip status="ACTIVE" />
          </div>
          <ProgressBar value={58} label="2 of 3 milestones submitted" />
          <div className="milestone-status-list">
            <div className="complete">
              <CheckCircle2 />
              <span>
                <strong>Connect and begin</strong>
                <small>Verified July 17 · Sparks eligibility reviewed</small>
              </span>
              <div>
                <strong>Up to 25</strong>
                <Sparks value="Sparks" />
              </div>
            </div>
            <div className="current">
              <span className="status-number">2</span>
              <span>
                <strong>Complete the welcome path</strong>
                <small>Evidence ready to submit</small>
              </span>
              <div>
                <strong>Up to 35</strong>
                <Sparks value="Sparks" />
              </div>
            </div>
            <div>
              <span className="status-number">3</span>
              <span>
                <strong>Share structured feedback</strong>
                <small>Unlocks after milestone 2</small>
              </span>
              <div>
                <strong>Up to 40</strong>
                <Sparks value="Sparks" />
              </div>
            </div>
          </div>
          <div className="submission-box">
            <div>
              <h3>Submit tutorial evidence</h3>
              <p>Add a clear screenshot or note showing the welcome path completion.</p>
            </div>
            <Button>Submit evidence</Button>
          </div>
        </Card>
        <aside>
          <Card>
            <h3>Verification timeline</h3>
            <div className="activity-list">
              <div>
                <Check />
                <span>
                  <strong>Campaign joined</strong>
                  <small>July 17 · 16:42</small>
                </span>
              </div>
              <div>
                <Check />
                <span>
                  <strong>Connection verified</strong>
                  <small>July 17 · 17:08</small>
                </span>
              </div>
              <div>
                <Clock3 />
                <span>
                  <strong>Tutorial in progress</strong>
                  <small>Last active 42 min ago</small>
                </span>
              </div>
            </div>
          </Card>
          <Card>
            <h3>Campaign support</h3>
            <p>Having trouble with a requirement or server connection?</p>
            <button className="button button--ghost">Contact support</button>
            <button className="button button--ghost">Report campaign</button>
          </Card>
        </aside>
      </div>
    </div>
  );
}

export function EarningsPage() {
  const [withdraw, setWithdraw] = useState(false);
  const transactions = [
    ["First island · Connect", "Milestone reward", "+$0.50", "VERIFIED", "Jul 17"],
    ["Arcane academy · Feedback", "Milestone reward", "+$2.10", "VERIFIED", "Jul 14"],
    ["Withdrawal", "Mock payout provider", "-$20.00", "PAID", "Jul 10"],
    ["Prison onboarding · Tutorial", "Milestone reward", "+$1.75", "VERIFIED", "Jul 8"],
    ["New frontier · Connect", "Milestone reward", "+$0.60", "PENDING", "Jul 18"],
  ] as const;
  return (
    <div className="dashboard-page">
      <PageHeading
        title="Earnings"
        description="Verified campaign rewards and withdrawal history."
        action={<Button onClick={() => setWithdraw(true)}>Request withdrawal</Button>}
      />
      <div className="earnings-cards">
        <Card className="earnings-card earnings-card--available">
          <span>
            <WalletCards /> Available to withdraw
          </span>
          <strong>$48.20</strong>
          <small>Minimum withdrawal $10.00</small>
        </Card>
        <Card>
          <span>
            <Clock3 /> Pending verification
          </span>
          <strong>$4.60</strong>
          <small>2 milestone submissions</small>
        </Card>
        <Card>
          <span>
            <History /> Withdrawn to date
          </span>
          <strong>$120.00</strong>
          <small>5 completed withdrawals</small>
        </Card>
      </div>
      <Card className="data-card">
        <div className="data-card__header">
          <div>
            <h2>Activity</h2>
            <p>Append-only reward and withdrawal records.</p>
          </div>
          <button className="button button--secondary">
            <Download /> Export
          </button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Type</th>
                <th>Status</th>
                <th>Date</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map(([description, type, amount, status, date]) => (
                <tr key={`${description}-${date}`}>
                  <td>
                    <strong>{description}</strong>
                  </td>
                  <td>{type}</td>
                  <td>
                    <StatusChip status={status} />
                  </td>
                  <td>{date}</td>
                  <td className={amount.startsWith("+") ? "positive" : ""}>
                    <strong>{amount}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Card className="earnings-notice">
        <ShieldCheck />
        <div>
          <h3>How verification works</h3>
          <p>
            Rewards remain pending until milestone evidence is approved. Fraudulent or duplicate
            submissions may be rejected. Earnings and Sparks are separate systems.
          </p>
        </div>
      </Card>
      {withdraw && (
        <Modal title="Request withdrawal" onClose={() => setWithdraw(false)}>
          <form
            className="modal__body form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              setWithdraw(false);
            }}
          >
            <label>
              Amount (USD)
              <input type="number" min="10" max="48.2" defaultValue="20.00" />
            </label>
            <label>
              Payout method
              <select>
                <option>Mock payout ·•• 2841</option>
              </select>
            </label>
            <div className="withdraw-summary">
              <span>
                Requested amount<b>$20.00</b>
              </span>
              <span>
                Estimated fee<b>$0.50</b>
              </span>
              <span>
                Estimated payout<strong>$19.50</strong>
              </span>
            </div>
            <p className="form-note">
              <LockKeyhole /> Payout requests are reviewed before processing. Sensitive destination
              details stay restricted.
            </p>
            <div className="modal__footer">
              <Button variant="ghost" type="button" onClick={() => setWithdraw(false)}>
                Cancel
              </Button>
              <Button type="submit">Submit request</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export function QuestsPage() {
  const quests = [
    ["Curious Explorer", "View two new server pages.", 1, 2, 120, Compass],
    ["Thoughtful Tester", "Submit one structured feedback response.", 0, 1, 300, MessageSquareText],
    ["Keep the Momentum", "Complete one campaign milestone.", 0, 1, 180, Target],
  ] as const;
  return (
    <div className="dashboard-page">
      <PageHeading
        title="Quests"
        description="Complete optional platform activities that may qualify for Sparks."
      />
      <Card className="quest-hero">
        <div>
          <Badge tone="purple">DAILY SET</Badge>
          <h2>3 quests · up to 60 Sparks may be available</h2>
          <p>Daily quests reset in 2h 18m. Completion could require verification.</p>
        </div>
        <div className="streak-large">
          <Flame />
          <strong>6</strong>
          <span>day streak</span>
        </div>
      </Card>
      <div className="quest-grid">
        {quests.map(([title, description, progress, target, reward, Icon]) => (
          <Card key={title}>
            <span className="quest-icon">
              <Icon />
            </span>
            <Badge tone="purple">Up to {Math.min(reward, 25)} Sparks</Badge>
            <h3>{title}</h3>
            <p>{description}</p>
            <ProgressBar value={(progress / target) * 100} label={`${progress} of ${target}`} />
          </Card>
        ))}
      </div>
    </div>
  );
}

export function SparksShopPage() {
  const [balance, setBalance] = useState(12430);
  const [selected, setSelected] = useState<(typeof cosmetics)[number] | null>(null);
  return (
    <div className="dashboard-page">
      <PageHeading
        title="Sparks Shop"
        description="Spend non-withdrawable Sparks on cosmetic and non-financial profile upgrades."
        action={
          <div className="balance-pill">
            <Sparkles /> <strong>{balance.toLocaleString()}</strong> Sparks
          </div>
        }
      />
      <Card className="sparks-disclaimer">
        <Sparkles />
        <div>
          <h3>Sparks are optional platform points.</h3>
          <p>
            Sparks have no cash value, cannot be transferred or withdrawn, and may be used only for
            eligible platform features.
          </p>
        </div>
      </Card>
      <div className="shop-tabs">
        <button className="active">Featured</button>
        <button>Frames</button>
        <button>Backgrounds</button>
        <button>Name effects</button>
        <button>Seasonal</button>
      </div>
      <div className="cosmetic-grid">
        {cosmetics.filter((item) => item.type !== "Badge").map((item) => (
          <Card key={item.id} className="cosmetic-card">
            <div className={`cosmetic-preview ${item.className}`}>
              <Palette />
              <Badge tone={item.rarity === "Epic" ? "purple" : "neutral"}>{item.rarity}</Badge>
            </div>
            <div>
              <small>{item.type}</small>
              <h3>{item.name}</h3>
              <button disabled={balance < item.price} onClick={() => setSelected(item)}>
                <Sparks value={item.price.toLocaleString()} />
              </button>
            </div>
          </Card>
        ))}
      </div>
      {selected && (
        <Modal title={`Unlock ${selected.name}`} onClose={() => setSelected(null)}>
          <div className="modal__body">
            <div className={`cosmetic-preview cosmetic-preview--modal ${selected.className}`}>
              <Palette />
            </div>
            <p>
              This cosmetic costs <strong>{selected.price.toLocaleString()} Sparks</strong>. Your
              Your remaining Sparks balance will update after confirmation.
            </p>
            <div className="withdraw-summary">
              <span>
                Current Sparks<b>{balance.toLocaleString()}</b>
              </span>
              <span>
                After purchase<strong>{(balance - selected.price).toLocaleString()}</strong>
              </span>
            </div>
          </div>
          <div className="modal__footer">
            <Button variant="ghost" onClick={() => setSelected(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setBalance(balance - selected.price);
                setSelected(null);
              }}
            >
              Unlock cosmetic
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

export function LeaderboardsPage() {
  return (
    <div className="dashboard-page">
      <PageHeading
        title="Leaderboards"
        description="Recognition for reputation and consistent, useful participation—not spending."
      />
      <div className="leaderboard-podium">
        {leaderboard.slice(0, 3).map(([name, tier, score, completions], index) => (
          <Card className={`podium podium--${index + 1}`} key={name}>
            <span className="podium-rank">{index + 1}</span>
            <span className="avatar avatar--large">{name.slice(0, 2)}</span>
            <h2>{name}</h2>
            <Badge tone={index === 0 ? "gold" : "purple"}>{tier}</Badge>
            <strong>{score} reputation</strong>
            <small>{completions} verified playtests</small>
          </Card>
        ))}
      </div>
      <Card className="data-card">
        <div className="data-card__header">
          <div>
            <h2>Top testers this season</h2>
            <p>Updated from verified participation and useful feedback.</p>
          </div>
          <div className="segmented">
            <button className="active">Global</button>
            <button>Friends</button>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Tester</th>
                <th>Tier</th>
                <th>Completions</th>
                <th>Reputation</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map(([name, tier, score, completions], index) => (
                <tr key={name}>
                  <td>
                    <strong>#{index + 1}</strong>
                  </td>
                  <td>
                    <span className="table-user">
                      <span className="avatar avatar--small">{name.slice(0, 2)}</span>
                      <strong>{name}</strong>
                    </span>
                  </td>
                  <td>{tier}</td>
                  <td>{completions}</td>
                  <td>
                    <strong>{score}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Card className="earnings-notice">
        <ShieldCheck />
        <div>
          <h3>Reputation cannot be bought.</h3>
          <p>
            It grows through honest completions, useful feedback, consistent participation, low
            rejection rates, and positive owner ratings.
          </p>
        </div>
      </Card>
    </div>
  );
}

export function CommunityPage() {
  const posts = [
    [
      "PixelHarbor",
      "Which onboarding moments make you leave a server?",
      "I’m collecting patterns before my next playtest. For me it’s a wall of chat text before I can move.",
      38,
      12,
    ],
    [
      "MossyBeacon",
      "Arcane Realms feedback thread",
      "The new spell preview made the academy path much easier to understand. Has anyone tested the controller prompts?",
      24,
      8,
    ],
    [
      "RedstoneRae",
      "Weekly server discovery: technical communities",
      "Three smaller servers with thoughtful build culture and clear rules.",
      51,
      19,
    ],
  ] as const;
  return (
    <div className="dashboard-page">
      <PageHeading
        title="Community"
        description="Compare experiences, share testing advice, and discover thoughtful servers."
        action={<Button>Start a discussion</Button>}
      />
      <div className="community-layout">
        <div>
          {posts.map(([author, title, body, likes, replies]) => (
            <Card className="post-card" key={title}>
              <div className="post-card__author">
                <span className="avatar">{author.slice(0, 2)}</span>
                <div>
                  <strong>{author}</strong>
                  <small>Trusted Tester · 2h ago</small>
                </div>
                <button className="icon-button">
                  <MoreHorizontal />
                </button>
              </div>
              <h2>{title}</h2>
              <p>{body}</p>
              <div className="post-card__actions">
                <button>
                  <Heart /> {likes}
                </button>
                <button>
                  <MessageSquareText /> {replies}
                </button>
                <button>Share</button>
              </div>
            </Card>
          ))}
        </div>
        <aside>
          <Card>
            <h3>Community guidelines</h3>
            <p>
              Be specific, respectful, and honest. Keep private campaign feedback out of public
              posts.
            </p>
            <Link to="/guidelines">Read guidelines →</Link>
          </Card>
          <Card>
            <h3>Trending topics</h3>
            {["#onboarding", "#survival", "#server-owners", "#feedback-tips", "#bedrock"].map(
              (tag) => (
                <Link key={tag} to="#">
                  {tag}
                </Link>
              ),
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}

export function ReferralsPage() {
  return (
    <div className="dashboard-page">
      <PageHeading
        title="Referrals"
        description="Invite thoughtful players to discover Nortix and earn cosmetic progression."
      />
      <Card className="referral-hero">
        <div>
          <Badge tone="purple">COMMUNITY INVITES</Badge>
          <h2>Bring better testers into the loop.</h2>
          <p>
            When a referred friend verifies their profile and completes a first honest playtest, you
            each account may receive up to 50 Sparks after eligibility checks.
          </p>
          <div className="referral-code">
            <code>NORTIX-QUARTZ-7H2K</code>
            <button className="button button--primary">
              <Copy /> Copy invite
            </button>
          </div>
        </div>
        <UserPlus />
      </Card>
      <div className="quick-stats">
        <Card>
          <span className="stat-icon stat-icon--purple">
            <Users />
          </span>
          <div>
            <small>Friends invited</small>
            <strong>7</strong>
            <span>4 completed onboarding</span>
          </div>
        </Card>
        <Card>
          <span className="stat-icon stat-icon--green">
            <Sparkles />
          </span>
          <div>
            <small>Sparks earned</small>
            <strong>2,000</strong>
            <span>Referral progression</span>
          </div>
        </Card>
        <Card>
          <span className="stat-icon stat-icon--blue">
            <Gift />
          </span>
          <div>
            <small>Next reward</small>
            <strong>1 invite</strong>
            <span>+500 Sparks</span>
          </div>
        </Card>
      </div>
      <Card className="data-card">
        <div className="data-card__header">
          <div>
            <h2>Invite history</h2>
            <p>Only privacy-safe referral status is shown.</p>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Friend</th>
                <th>Joined</th>
                <th>Status</th>
                <th>Reward</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["CraftingCedar", "Jul 15", "COMPLETED", "+500 Sparks"],
                ["BlueQuartz", "Jul 13", "ACTIVE", "Pending"],
                ["NetherNova", "Jul 2", "COMPLETED", "+500 Sparks"],
              ].map((row) => (
                <tr key={row[0]}>
                  {row.map((cell, index) => (
                    <td key={cell}>{index === 2 ? <StatusChip status={cell} /> : cell}</td>
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

export function ProfilePage() {
  return (
    <div className="dashboard-page">
      <PageHeading
        title="Profile"
        description="Your public tester identity, reputation, and cosmetic loadout."
        action={
          <button className="button button--secondary">
            <Settings /> Edit profile
          </button>
        }
      />
      <Card className="profile-card">
        <div className="profile-banner">
          <span className="profile-avatar">QT</span>
        </div>
        <div className="profile-card__body">
          <div>
            <h1>
              QuartzTester <ShieldCheck />
            </h1>
            <p>@quartztester · Joined February 2026</p>
            <div className="chip-row">
              <Badge tone="purple">Trusted Tester</Badge>
              <Badge>Level 18</Badge>
              <Badge>854 reputation</Badge>
            </div>
          </div>
          <button className="button button--secondary">Customize profile</button>
        </div>
        <p className="profile-bio">
          Minecraft explorer, onboarding nerd, and collector of suspiciously specific bug reports.
        </p>
        <div className="profile-stats">
          <span>
            <strong>37</strong>
            <small>Verified playtests</small>
          </span>
          <span>
            <strong>21</strong>
            <small>Useful feedback ratings</small>
          </span>
          <span>
            <strong>4.9</strong>
            <small>Owner rating</small>
          </span>
          <span>
            <strong>2%</strong>
            <small>Rejection rate</small>
          </span>
        </div>
      </Card>
      <div className="profile-grid">
        <Card>
          <h2>Participation summary</h2>
          <p>Verified activity may contribute to reputation and future campaign matching.</p>
          <div className="profile-stats">
            <span><strong>14</strong><small>Campaigns reviewed</small></span>
            <span><strong>92%</strong><small>Useful responses</small></span>
          </div>
        </Card>
        <Card>
          <h2>Reputation</h2>
          <div className="reputation-meter">
            <span style={{ width: "72%" }} />
          </div>
          <div className="reputation-labels">
            <strong>Trusted Tester</strong>
            <span>146 rep to Veteran Tester</span>
          </div>
          <p>Reputation reflects verified work and cannot be purchased with Sparks.</p>
        </Card>
      </div>
    </div>
  );
}

export function PlaceholderDashboardPage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="dashboard-page">
      <PageHeading title={title} description={description} />
      <Card className="empty-panel">
        <Settings />
        <h2>{title} is ready for configuration</h2>
        <p>
          This route is connected to the Nortix dashboard shell and reserved for its documented
          workflow.
        </p>
        <Button variant="secondary">Back to dashboard</Button>
      </Card>
    </div>
  );
}
