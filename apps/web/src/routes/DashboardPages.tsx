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
  Link2,
  MessageSquareText,
  MoreHorizontal,
  Palette,
  Search,
  Target,
  Settings,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Unlink2,
  Users,
  WalletCards,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Badge, Button, Card, ProgressBar, Sparks, StatusChip } from "@nortix/ui";
import { CampaignCard } from "../components/CampaignCard";
import { Modal } from "../components/Modal";
import { ServerCard } from "../components/ServerCard";
import { ReferenceDashboardHome } from "../components/ReferenceDashboardHome";
import { SeededProgressPage } from "../components/SeededProgressPage";
import {
  type CosmeticItem,
  useCosmetics,
  useCurrentUser,
  useDailyQuests,
  useLeaderboard,
  useParticipations,
  usePublicCampaigns,
  usePublicServers,
  useSparksSummary,
} from "../features/api-data";
import { api } from "../lib/api";

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
  const { data } = usePublicCampaigns();
  const campaigns = data?.items ?? [];
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
  const { data, isLoading, isError, refetch } = usePublicServers();
  const servers = data?.items ?? [];
  const filtered = servers.filter((server) =>
    `${server.name} ${server.categories.join(" ")}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <div className="dashboard-page">
      <PageHeading
        title="Servers"
        description="Explore live public Minecraft servers and verified Nortix communities."
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
        {isLoading ? <Card><p>Loading servers…</p></Card> : null}
        {isError ? <Card><p>Servers could not be loaded.</p><Button onClick={() => refetch()}>Retry</Button></Card> : null}
        {!isLoading && !isError && filtered.length === 0 ? <Card><p>No servers match this search.</p></Card> : null}
        {filtered.map((server) => <ServerCard server={server} key={server.id} />)}
      </div>
    </div>
  );
}

export function DashboardCampaignsPage() {
  const [tab, setTab] = useState("Newest");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ALL");
  const [edition, setEdition] = useState("ALL");
  const { data, isLoading, isError, refetch } = usePublicCampaigns();
  const campaigns = data?.items ?? [];
  const categories = useMemo(
    () => ["ALL", ...new Set(campaigns.map((campaign) => campaign.category).filter(Boolean))],
    [campaigns],
  );
  const visibleCampaigns = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = campaigns.filter((campaign) => {
      const searchableText = [
        campaign.title,
        campaign.description,
        campaign.category,
        campaign.server.name,
        campaign.server.edition,
        ...campaign.server.categories,
        ...campaign.versionRequirements,
      ].join(" ").toLowerCase();
      return (
        (category === "ALL" || campaign.category === category) &&
        (edition === "ALL" || campaign.server.edition === edition) &&
        (!query || searchableText.includes(query))
      );
    });
    return [...filtered].sort((left, right) => {
      if (tab === "Highest Sparks limit") return right.maximumSparksReward - left.maximumSparksReward;
      if (tab === "Ending soon") return new Date(left.endsAt).getTime() - new Date(right.endsAt).getTime();
      return new Date(right.startsAt).getTime() - new Date(left.startsAt).getTime();
    });
  }, [campaigns, category, edition, search, tab]);
  return (
    <div className="dashboard-page">
      <PageHeading
        title="Campaigns"
        description="Explore optional playtests that may provide Sparks after verification."
      />
      <div className="dashboard-filter campaign-filters">
        <label>
          <Search />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search campaigns, servers, or versions" />
        </label>
        <select aria-label="Filter campaigns by category" value={category} onChange={(event) => setCategory(event.target.value)}>
          {categories.map((item) => <option value={item} key={item}>{item === "ALL" ? "All categories" : item}</option>)}
        </select>
        <select aria-label="Filter campaigns by edition" value={edition} onChange={(event) => setEdition(event.target.value)}>
          <option value="ALL">All editions</option>
          <option value="JAVA">Java</option>
          <option value="BEDROCK">Bedrock</option>
        </select>
      </div>
      <div className="tabs">
        {["Newest", "Highest Sparks limit", "Ending soon"].map((item) => (
          <button className={tab === item ? "active" : ""} onClick={() => setTab(item)} key={item}>
            {item}
          </button>
        ))}
      </div>
      <div className="campaign-grid">
        {isLoading ? <Card><p>Loading seeded campaigns…</p></Card> : null}
        {isError ? <Card><p>Seeded campaigns could not be loaded.</p><Button onClick={() => refetch()}>Retry</Button></Card> : null}
        {!isLoading && !isError && visibleCampaigns.length === 0 ? <Card><p>No campaigns match these filters.</p></Card> : null}
        {visibleCampaigns.map((campaign) => (
          <CampaignCard campaign={campaign} key={campaign.id} />
        ))}
      </div>
    </div>
  );
}

function _LegacyProgressPage() {
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

export function ProgressPage() {
  return <SeededProgressPage />;
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
  const { data, isLoading, isError, refetch } = useDailyQuests();
  const quests = data ?? [];
  const questIcons = {
    SERVER_VIEWS: Compass,
    FEEDBACK: MessageSquareText,
    MILESTONE: Target,
  } as const;
  const totalPotentialSparks = quests.reduce((total, quest) => total + quest.sparksReward, 0);
  const completedQuests = quests.filter((quest) => quest.completedAt).length;
  return (
    <div className="dashboard-page">
      <PageHeading
        title="Quests"
        description="Complete optional platform activities that may qualify for Sparks."
      />
      <Card className="quest-hero">
        <div>
          <Badge tone="purple">DAILY SET</Badge>
          <h2>{quests.length} quests · up to {totalPotentialSparks} Sparks may be available</h2>
          <p>Quest progress comes from the current seeded account and may require verification.</p>
        </div>
        <div className="streak-large">
          <Flame />
          <strong>{completedQuests}</strong>
          <span>completed today</span>
        </div>
      </Card>
      <div className="quest-grid">
        {isLoading ? <Card><p>Loading seeded quests…</p></Card> : null}
        {isError ? <Card><p>Seeded quests could not be loaded.</p><Button onClick={() => refetch()}>Retry</Button></Card> : null}
        {quests.map((quest) => {
          const Icon = questIcons[quest.type as keyof typeof questIcons] ?? Target;
          return (
          <Card key={quest.id}>
            <span className="quest-icon">
              <Icon />
            </span>
            <Badge tone="purple">Up to {quest.sparksReward} Sparks</Badge>
            <h3>{quest.title}</h3>
            <p>{quest.description}</p>
            <ProgressBar value={(quest.progress / quest.target) * 100} label={`${quest.progress} of ${quest.target}`} />
          </Card>
          );
        })}
      </div>
    </div>
  );
}

export function SparksShopPage() {
  const { data: cosmeticItems, isLoading, isError, refetch } = useCosmetics();
  const { data: sparksSummary, refetch: refetchSparks } = useSparksSummary();
  const cosmetics = cosmeticItems ?? [];
  const balance = sparksSummary?.balance ?? 0;
  const [selected, setSelected] = useState<CosmeticItem | null>(null);
  const [purchaseMessage, setPurchaseMessage] = useState("");
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
        {isLoading ? <Card><p>Loading seeded cosmetics…</p></Card> : null}
        {isError ? <Card><p>Seeded cosmetics could not be loaded.</p><Button onClick={() => refetch()}>Retry</Button></Card> : null}
        {cosmetics.filter((item) => item.type !== "BADGE").map((item) => (
          <Card key={item.id} className="cosmetic-card">
            <div
              className="cosmetic-preview"
              style={{ backgroundColor: String(item.preview.color ?? "") || undefined }}
            >
              <Palette />
              <Badge tone={item.rarity === "EPIC" ? "purple" : "neutral"}>{item.rarity}</Badge>
            </div>
            <div>
              <small>{item.type.replaceAll("_", " ")}</small>
              <h3>{item.name}</h3>
              <button disabled={balance < item.sparksPrice} onClick={() => setSelected(item)}>
                <Sparks value={item.sparksPrice.toLocaleString()} />
              </button>
            </div>
          </Card>
        ))}
      </div>
      {selected && (
        <Modal title={`Unlock ${selected.name}`} onClose={() => setSelected(null)}>
          <div className="modal__body">
            <div
              className="cosmetic-preview cosmetic-preview--modal"
              style={{ backgroundColor: String(selected.preview.color ?? "") || undefined }}
            >
              <Palette />
            </div>
            <p>
              This cosmetic costs <strong>{selected.sparksPrice.toLocaleString()} Sparks</strong>. Your
              Your remaining Sparks balance will update after confirmation.
            </p>
            <div className="withdraw-summary">
              <span>
                Current Sparks<b>{balance.toLocaleString()}</b>
              </span>
              <span>
                After purchase<strong>{(balance - selected.sparksPrice).toLocaleString()}</strong>
              </span>
            </div>
            {purchaseMessage ? <p role="status">{purchaseMessage}</p> : null}
          </div>
          <div className="modal__footer">
            <Button variant="ghost" onClick={() => setSelected(null)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                setPurchaseMessage("");
                try {
                  await api("/sparks/purchases", {
                    method: "POST",
                    body: JSON.stringify({ itemId: selected.id }),
                  });
                  await refetchSparks();
                  setSelected(null);
                } catch (error) {
                  setPurchaseMessage(
                    error instanceof Error ? error.message : "The cosmetic could not be unlocked.",
                  );
                }
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
  const { data, isLoading, isError, refetch } = useLeaderboard();
  const leaderboard = data ?? [];
  return (
    <div className="dashboard-page">
      <PageHeading
        title="Leaderboards"
        description="Recognition for reputation and consistent, useful participation—not spending."
      />
      <div className="leaderboard-podium">
        {isLoading ? <Card><p>Loading seeded leaderboard…</p></Card> : null}
        {isError ? <Card><p>The seeded leaderboard could not be loaded.</p><Button onClick={() => refetch()}>Retry</Button></Card> : null}
        {leaderboard.slice(0, 3).map((entry, index) => (
          <Card className={`podium podium--${index + 1}`} key={entry.username}>
            <span className="podium-rank">{index + 1}</span>
            <span className="avatar avatar--large">{entry.username.slice(0, 2)}</span>
            <h2>{entry.displayName ?? entry.username}</h2>
            <Badge tone={index === 0 ? "gold" : "purple"}>{entry.reputationTier}</Badge>
            <strong>{entry.reputationScore} reputation</strong>
            <small>Tester level {entry.testerLevel}</small>
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
                <th>Level</th>
                <th>Reputation</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry, index) => (
                <tr key={entry.username}>
                  <td>
                    <strong>#{index + 1}</strong>
                  </td>
                  <td>
                    <span className="table-user">
                      <span className="avatar avatar--small">{entry.username.slice(0, 2)}</span>
                      <strong>{entry.displayName ?? entry.username}</strong>
                    </span>
                  </td>
                  <td>{entry.reputationTier}</td>
                  <td>{entry.testerLevel}</td>
                  <td>
                    <strong>{entry.reputationScore}</strong>
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
  type IdentityData = {
    premium: Array<{ id: string; uuid: string; username: string; createdAt: string }>;
    cracked: Array<{
      id: string;
      minecraftUsername: string;
      status: "PENDING" | "ACTIVE";
      expiresAt: string;
      activatedAt?: string;
      server: { id: string; name: string; slug: string };
    }>;
    activity: Array<{
      id: string;
      type: string;
      identityKind: string;
      minecraftUsername?: string;
      createdAt: string;
      server?: { name: string };
    }>;
  };
  type ServerOption = { id: string; name: string; crackedAccountLinkingAvailable?: boolean };
  const [identityData, setIdentityData] = useState<IdentityData>({
    premium: [],
    cracked: [],
    activity: [],
  });
  const [serverOptions, setServerOptions] = useState<ServerOption[]>([]);
  const [claim, setClaim] = useState<{ code: string; expiresAt: string; verificationServer: string }>();
  const [claimOpen, setClaimOpen] = useState(false);
  const [serverId, setServerId] = useState("");
  const [crackedName, setCrackedName] = useState("");
  const [identityMessage, setIdentityMessage] = useState("");
  const [identityBusy, setIdentityBusy] = useState(false);
  const [profileEditOpen, setProfileEditOpen] = useState(false);
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [profileDraft, setProfileDraft] = useState({
    username: "",
    displayName: "",
    bio: "",
    backgroundColor: "slate" as "slate" | "violet" | "ocean" | "moss" | "ember",
    isPublic: true,
    showReputation: true,
  });
  const { data: currentUser } = useCurrentUser();
  const queryClient = useQueryClient();
  const { data: participations = [] } = useParticipations();
  const approvedMilestones = participations.reduce(
    (total, participation) => total + participation.completions.filter((item) => item.status === "APPROVED").length,
    0,
  );

  const refreshIdentities = async () => {
    const result = await api<IdentityData>("/minecraft-identities");
    setIdentityData(result);
  };

  useEffect(() => {
    refreshIdentities().catch((error: Error) => setIdentityMessage(error.message));
    api<{ items: ServerOption[] }>("/servers?pageSize=50")
      .then((result) => {
        setServerOptions(result.items);
        setServerId((current) => current || result.items.find((item) => item.crackedAccountLinkingAvailable)?.id || "");
      })
      .catch(() => undefined);
  }, []);

  const createPremiumClaim = async () => {
    setIdentityBusy(true);
    setIdentityMessage("");
    try {
      const newClaim = await api<{ code: string; expiresAt: string; verificationServer: string }>("/minecraft-identities/premium/claims", { method: "POST", body: "{}" });
      setClaim(newClaim);
      setClaimOpen(true);
      await refreshIdentities();
    } catch (error) {
      setIdentityMessage((error as Error).message);
    } finally {
      setIdentityBusy(false);
    }
  };

  const reserveCracked = async () => {
    setIdentityBusy(true);
    setIdentityMessage("");
    try {
      await api("/minecraft-identities/cracked/claims", {
        method: "POST",
        body: JSON.stringify({ serverId, minecraftUsername: crackedName }),
      });
      setCrackedName("");
      setIdentityMessage("Reserved. Join that server with this exact name within 30 minutes.");
      await refreshIdentities();
    } catch (error) {
      setIdentityMessage((error as Error).message);
    } finally {
      setIdentityBusy(false);
    }
  };

  const unlink = async (kind: "premium" | "cracked", id: string, activated = false) => {
    const warning = kind === "cracked" && activated
      ? "Release this server-scoped name? Because it has already played on the server, it cannot be reserved again."
      : kind === "cracked"
        ? "Cancel this pending name reservation?"
        : "Unlink this premium Minecraft account? It can be verified again later.";
    if (!window.confirm(warning)) return;
    await api(`/minecraft-identities/${kind}/${id}`, { method: "DELETE" });
    await refreshIdentities();
  };

  const openProfileEditor = () => {
    setProfileMessage("");
    setProfileDraft({
      username: currentUser?.username ?? "",
      displayName: currentUser?.displayName ?? "",
      bio: currentUser?.publicProfile?.bio ?? "",
      backgroundColor: currentUser?.publicProfile?.backgroundColor ?? "slate",
      isPublic: currentUser?.publicProfile?.isPublic !== false,
      showReputation: currentUser?.publicProfile?.showReputation !== false,
    });
    setProfileEditOpen(true);
  };

  const saveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProfileBusy(true);
    setProfileMessage("");
    try {
      const updated = await api<typeof currentUser>("/users/me/profile", {
        method: "PATCH",
        body: JSON.stringify(profileDraft),
      });
      queryClient.setQueryData(["current-user"], updated);
      setProfileEditOpen(false);
      setProfileMessage("Profile updated.");
    } catch (error) {
      setProfileMessage((error as Error).message);
    } finally {
      setProfileBusy(false);
    }
  };

  const shareProfile = async () => {
    if (!currentUser) return;
    const url = `${window.location.origin}/profile/${encodeURIComponent(currentUser.username)}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${currentUser.displayName ?? currentUser.username} on Nortix`, url });
      } else {
        await navigator.clipboard.writeText(url);
        setProfileMessage("Profile link copied.");
      }
    } catch {
      setProfileMessage("Profile sharing was cancelled.");
    }
  };

  return (
    <div className="dashboard-page">
      <PageHeading
        title="Profile"
        description="Your public tester identity, reputation, and profile settings."
        action={
          <button className="button button--secondary" onClick={openProfileEditor}>
            <Settings /> Edit profile
          </button>
        }
      />
      <Card className="profile-card">
        <div className={`profile-banner profile-banner--${currentUser?.publicProfile?.backgroundColor ?? "slate"}`}>
          <span className="profile-avatar">{currentUser?.username.slice(0, 2).toUpperCase() ?? "—"}</span>
        </div>
        <div className="profile-card__body">
          <div>
            <h1>
              {currentUser?.displayName ?? currentUser?.username ?? "Loading profile…"} <ShieldCheck />
            </h1>
            <p>@{currentUser?.username ?? "loading"}</p>
            <div className="chip-row">
              <Badge tone="purple">{currentUser?.reputationTier ?? "Unranked"}</Badge>
              <Badge>Level {currentUser?.testerLevel ?? 0}</Badge>
              <Badge>{currentUser?.reputationScore ?? 0} reputation</Badge>
            </div>
          </div>
          <button className="button button--secondary" onClick={() => void shareProfile()}>
            <Link2 /> Share profile
          </button>
        </div>
        <p className="profile-bio">{currentUser?.publicProfile?.bio || "Add a short intro so other testers know what you enjoy playing."}</p>
        {profileMessage ? <p className="profile-message" role="status">{profileMessage}</p> : null}
        <div className="profile-stats">
          <span>
            <strong>{approvedMilestones}</strong>
            <small>Verified playtests</small>
          </span>
          <span>
            <strong>{participations.length}</strong>
            <small>Participation records</small>
          </span>
          <span>
            <strong>{identityData.premium.length}</strong>
            <small>Premium identities</small>
          </span>
          <span>
            <strong>{identityData.cracked.length}</strong>
            <small>Server-scoped identities</small>
          </span>
        </div>
      </Card>
      {profileEditOpen ? (
        <Modal title="Edit profile" className="modal--compact" onClose={() => setProfileEditOpen(false)}>
          <form onSubmit={saveProfile}>
            <div className="modal__body profile-edit-form">
              <p>Keep it simple. These details can appear on your shared public profile.</p>
              <label>Username<input required minLength={3} maxLength={16} pattern="[A-Za-z0-9_]{3,16}" value={profileDraft.username} onChange={(event) => setProfileDraft({ ...profileDraft, username: event.target.value })} /></label>
              <label>Display name<input required maxLength={80} value={profileDraft.displayName} onChange={(event) => setProfileDraft({ ...profileDraft, displayName: event.target.value })} /></label>
              <label>Bio<textarea rows={3} maxLength={240} placeholder="A short intro about your Minecraft interests" value={profileDraft.bio} onChange={(event) => setProfileDraft({ ...profileDraft, bio: event.target.value })} /></label>
              <label>Profile background<select value={profileDraft.backgroundColor} onChange={(event) => setProfileDraft({ ...profileDraft, backgroundColor: event.target.value as typeof profileDraft.backgroundColor })}><option value="slate">Slate</option><option value="violet">Violet</option><option value="ocean">Ocean</option><option value="moss">Moss</option><option value="ember">Ember</option></select></label>
              <label className="checkbox-row"><input type="checkbox" checked={profileDraft.isPublic} onChange={(event) => setProfileDraft({ ...profileDraft, isPublic: event.target.checked })} /> Show my profile when someone opens my link</label>
              <label className="checkbox-row"><input type="checkbox" checked={profileDraft.showReputation} onChange={(event) => setProfileDraft({ ...profileDraft, showReputation: event.target.checked })} /> Show my reputation and tester level</label>
            </div>
            <div className="modal__footer">
              <button className="button button--ghost" type="button" onClick={() => setProfileEditOpen(false)}>Cancel</button>
              <Button type="submit" disabled={profileBusy}>{profileBusy ? "Saving…" : "Save profile"}</Button>
            </div>
          </form>
        </Modal>
      ) : null}
      <div className="profile-grid">
        <Card>
          <h2>Participation summary</h2>
          <p>Verified activity may contribute to reputation and future campaign matching.</p>
          <div className="profile-stats">
            <span><strong>{participations.length}</strong><small>Campaign records</small></span>
            <span><strong>{approvedMilestones}</strong><small>Verified milestones</small></span>
          </div>
        </Card>
        <Card>
          <h2>Reputation</h2>
          <div className="reputation-meter">
            <span style={{ width: `${Math.min(100, (currentUser?.reputationScore ?? 0) / 10)}%` }} />
          </div>
          <div className="reputation-labels">
            <strong>{currentUser?.reputationTier ?? "Unranked"}</strong>
            <span>{currentUser?.reputationScore ?? 0} reputation</span>
          </div>
          <p>Reputation reflects verified work and cannot be purchased with Sparks.</p>
        </Card>
      </div>
      <section className="identity-center">
        <div className="identity-center__heading">
          <div>
            <span className="eyebrow">MINECRAFT IDENTITY</span>
            <h2>Account linking</h2>
            <p>Premium accounts are verified once on Nortix. Cracked names are private, temporary, and scoped to one server.</p>
          </div>
          <button className="button button--secondary" onClick={() => refreshIdentities()}>
            <History /> Refresh status
          </button>
        </div>
        {identityMessage && <div className="identity-notice" role="status">{identityMessage}</div>}
        <div className="identity-link-grid">
          <Card className="identity-link-card">
            <div className="identity-link-card__title"><ShieldCheck /><div><h3>Premium Java account</h3><p>Verified through Nortix’s online-mode server. No OAuth or account password is requested.</p></div></div>
            {identityData.premium.map((identity) => (
              <div className="identity-record" key={identity.id}>
                <span><strong>{identity.username}</strong><small>{identity.uuid}</small></span>
                <Badge>Verified once</Badge>
                <button aria-label={`Unlink ${identity.username}`} onClick={() => unlink("premium", identity.id)}><Unlink2 /></button>
              </div>
            ))}
            {identityData.premium.length === 0 && <p className="identity-empty">No premium Minecraft account is linked yet.</p>}
            {claim ? (
              <div className="identity-claim-ready">
                <span><strong>Claim code ready</strong><small>Expires {new Date(claim.expiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</small></span>
                <button className="button button--secondary button--small" onClick={() => setClaimOpen(true)}>View instructions</button>
              </div>
            ) : (
              <button className="button button--primary" disabled={identityBusy} onClick={createPremiumClaim}>
                <Link2 /> Verify a premium account
              </button>
            )}
          </Card>
          <Card className="identity-link-card">
            <div className="identity-link-card__title"><Gamepad2 /><div><h3>Cracked server account</h3><p>Reserve the exact name before its first-ever join. This does not appear on your public profile.</p></div></div>
            <label className="identity-field"><span>Server</span><select value={serverId} onChange={(event) => setServerId(event.target.value)}><option value="">Choose a supported server</option>{serverOptions.map((server) => <option value={server.id} key={server.id} disabled={!server.crackedAccountLinkingAvailable}>{server.name}{server.crackedAccountLinkingAvailable ? "" : " · linking unavailable"}</option>)}</select></label>
            <label className="identity-field"><span>Exact Minecraft name</span><input value={crackedName} maxLength={16} placeholder="nortix123" onChange={(event) => setCrackedName(event.target.value)} /></label>
            <button className="button button--primary" disabled={identityBusy || !serverId || !/^[A-Za-z0-9_]{3,16}$/.test(crackedName)} onClick={reserveCracked}><Clock3 /> Reserve for 30 minutes</button>
            <small className="identity-rules">Up to 3 reservations per hour and 5 per rolling day. Unused reservations expire automatically.</small>
          </Card>
        </div>
        {identityData.cracked.length > 0 && <Card className="identity-active-card">
          <h3>Server-scoped links</h3>
          {identityData.cracked.map((link) => <div className="identity-record" key={link.id}>
            <span><strong>{link.minecraftUsername}</strong><small>{link.server.name} · {link.status === "PENDING" ? "Waiting for first join" : "First join confirmed"}</small></span>
            <Badge tone={link.status === "ACTIVE" ? "success" : "purple"}>{link.status}</Badge>
            <button aria-label={`Release ${link.minecraftUsername}`} onClick={() => unlink("cracked", link.id, link.status === "ACTIVE")}><Unlink2 /></button>
          </div>)}
        </Card>}
        <Card className="identity-activity-card">
          <h3>Private identity activity</h3>
          <p>Only you and authorized Nortix safety staff can see this history.</p>
          <div className="identity-timeline">
            {identityData.activity.length === 0 && <span className="identity-empty">No identity activity yet.</span>}
            {identityData.activity.map((event) => <div key={event.id}><i /><span><strong>{event.type.replaceAll("_", " ").toLowerCase()}</strong><small>{event.minecraftUsername || "Minecraft account"}{event.server ? ` · ${event.server.name}` : ""} · {new Date(event.createdAt).toLocaleString()}</small></span></div>)}
          </div>
        </Card>
      </section>
      {claim && claimOpen ? (
        <Modal title="Link your premium Minecraft account" className="modal--compact premium-claim-modal" onClose={() => setClaimOpen(false)}>
          <div className="modal__body">
            <div className="identity-claim-code premium-claim-modal__code">
              <small>Join <strong>{claim.verificationServer}</strong>, then run</small>
              <code>/nortixclaim {claim.code}</code>
              <button className="button button--ghost button--small" onClick={() => void navigator.clipboard.writeText(`/nortixclaim ${claim.code}`)}><Copy /> Copy command</button>
              <span>Expires {new Date(claim.expiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
            <div className="premium-link-steps">
              <div><b>1</b><span><strong>Join the verification server</strong><small>Open Minecraft Java Edition and connect to the server shown above.</small></span></div>
              <div><b>2</b><span><strong>Run the command</strong><small>Paste the command into Minecraft chat and send it. Never share your one-time code.</small></span></div>
              <div><b>3</b><span><strong>Come back to Nortix</strong><small>We will verify the account automatically. This claim expires soon, so finish before the time shown above.</small></span></div>
            </div>
          </div>
          <div className="modal__footer">
            <Button type="button" onClick={() => setClaimOpen(false)}>Done</Button>
          </div>
        </Modal>
      ) : null}
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
