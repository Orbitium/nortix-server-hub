import {
  ArrowRight,
  Award,
  Bot,
  Check,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Copy,
  Flame,
  Gamepad2,
  Gift,
  Globe2,
  Heart,
  History,
  Link2,
  Lock,
  Mountain,
  MessageSquareText,
  MoreHorizontal,
  Palette,
  Radio,
  Search,
  ServerCog,
  Target,
  ThumbsUp,
  Settings,
  ShieldCheck,
  Sparkles,
  Tag,
  UserPlus,
  Unlink2,
  Users,
  Zap,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Badge, Button, Card, ProgressBar, Sparks, StatusChip } from "@nortix/ui";
import { CampaignCard } from "../components/CampaignCard";
import { Modal } from "../components/Modal";
import { ServerCard } from "../components/ServerCard";
import { ReferenceDashboardHome } from "../components/ReferenceDashboardHome";
import { SeededProgressPage } from "../components/SeededProgressPage";
import {
  type ProfileCosmeticItem,
  type ProfileCosmeticType,
  type SponsoredItem,
  type SponsoredStore,
  useCurrentUser,
  useDailyQuests,
  useLeaderboard,
  useParticipations,
  useProfileActivity,
  useProfileCosmetics,
  usePublicCampaigns,
  usePublicServers,
  useReferrals,
  useSparksSummary,
  useSponsoredPurchases,
  useSponsoredStores,
  useVotingServers,
} from "../features/api-data";
import { api } from "../lib/api";
import { showGoogleRewardedAd } from "../lib/google-rewarded-ad";
import { TurnstileWidget } from "../components/TurnstileWidget";
import { useI18n } from "../lib/i18n";
import { readRolePreference, saveRolePreference } from "../lib/role-preference";
import { filterServers, getServerFilterOptions } from "../lib/server-filtering";
import { isInsufficientSparksError, sparksPurchaseTotal } from "../lib/sparks-purchase";
import { referralRegistrationUrl } from "../lib/referral-link";
import {
  friendReferralEarningWindowDays,
  maxFriendReferralInvitesPerMonth,
  maxSponsoredPurchaseQuantity,
  minecraftMajorVersions,
  serverTypes,
} from "@nortix/shared";

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

const cosmeticTypes: Array<{ type: ProfileCosmeticType; label: string }> = [
  { type: "AVATAR", label: "Avatars" },
  { type: "BANNER", label: "Banners" },
  { type: "BADGE", label: "Badges" },
  { type: "TITLE", label: "Titles" },
  { type: "THEME", label: "Themes" },
];

const CosmeticGlyph = ({ item }: { item: Pick<ProfileCosmeticItem, "preview"> }) => {
  const pixelIcons = new Set([
    "block",
    "meadow",
    "pickaxe",
    "pixel-heart",
    "portal",
    "redstone",
    "river",
    "slime",
    "sprout",
    "sunrise",
  ]);
  if (pixelIcons.has(item.preview.icon)) {
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true" className="cosmetic-pixel-svg">
        <rect x="10" y="10" width="44" height="44" rx="8" fill="var(--cosmetic-primary)" />
        {item.preview.icon === "pixel-heart" ? (
          <path d="M16 24h8v-6h8v6h8v-6h8v6h6v10L32 52 10 34V24h6Z" fill="var(--cosmetic-accent)" />
        ) : item.preview.icon === "pickaxe" ? (
          <path d="m15 18 7-7 27 27-7 7-9-9-13 17-6-5 13-18-12-12Zm18-7h17v8H33Z" fill="var(--cosmetic-accent)" />
        ) : item.preview.icon === "slime" ? (
          <path d="M16 20h32v28H16Zm7 9h7v7h-7Zm18 0h7v7h-7ZM27 40h14v5H27Z" fill="var(--cosmetic-accent)" />
        ) : item.preview.icon === "portal" ? (
          <path fill="var(--cosmetic-accent)" fillRule="evenodd" d="M17 10h30v44H17Zm8 9v26h14V19Z" />
        ) : item.preview.icon === "sunrise" ? (
          <path d="M10 42h44v8H10Zm10-5a12 12 0 0 1 24 0Zm-3-13-6-5 5-5 6 6Zm30 0-5-4 6-6 5 5Z" fill="var(--cosmetic-accent)" />
        ) : (
          <path d="M14 45h36v7H14Zm6-8h24v6H20Zm7-9h10v9H27Zm3-17h5v17h-5Z" fill="var(--cosmetic-accent)" />
        )}
      </svg>
    );
  }
  const icons = {
    award: Award,
    bot: Bot,
    compass: Target,
    leaf: Palette,
    message: MessageSquareText,
    mountain: Mountain,
    orbit: Globe2,
    radio: Radio,
    "shield-check": ShieldCheck,
    sparkles: Sparkles,
    tag: Tag,
    user: Users,
    waves: Flame,
    zap: Zap,
  };
  const Icon = icons[item.preview.icon as keyof typeof icons] ?? Sparkles;
  return <Icon aria-hidden="true" />;
};

const relativeActivityTime = (occurredAt: string) => {
  const elapsed = Date.now() - Date.parse(occurredAt);
  const minutes = Math.max(1, Math.floor(elapsed / 60_000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

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
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ALL");
  const [version, setVersion] = useState("ALL");
  const { data, isLoading, isError, refetch } = usePublicServers();
  const servers = data?.items ?? [];
  const filterOptions = useMemo(() => getServerFilterOptions(servers), [servers]);
  const filtered = useMemo(
    () => filterServers(servers, { search, category, version }),
    [servers, search, category, version],
  );
  return (
    <div className="dashboard-page">
      <PageHeading title={t("ui.servers")} description={t("ui.serverDescription")} />
      <div className="dashboard-filter server-filters">
        <label>
          <Search />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("ui.searchServers")}
          />
        </label>
        <select
          className="filter-select"
          aria-label={t("ui.allCategories")}
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        >
          <option value="ALL">{t("ui.allCategories")}</option>
          {filterOptions.categories.map((item) => (
            <option value={item} key={item}>
              {item}
            </option>
          ))}
        </select>
        <select
          className="filter-select"
          aria-label={t("ui.allVersions")}
          value={version}
          onChange={(event) => setVersion(event.target.value)}
        >
          <option value="ALL">{t("ui.allVersions")}</option>
          {filterOptions.versions.map((item) => (
            <option value={item} key={item}>
              {item}
            </option>
          ))}
        </select>
      </div>
      <div className="server-grid">
        {isLoading ? (
          <Card className="directory-status-card">
            <p>Loading servers…</p>
          </Card>
        ) : null}
        {isError ? (
          <Card className="directory-status-card">
            <p>{t("listing.serverError")}</p>
            <Button onClick={() => refetch()}>{t("ui.retry")}</Button>
          </Card>
        ) : null}
        {!isLoading && !isError && filtered.length === 0 ? (
          <Card className="directory-status-card">
            <p>{t("ui.noServers")}</p>
          </Card>
        ) : null}
        {filtered.map((server) => (
          <ServerCard server={server} key={server.id} />
        ))}
      </div>
    </div>
  );
}

export function DashboardCampaignsPage() {
  const { t } = useI18n();
  const [tab, setTab] = useState("Newest");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ALL");
  const [version, setVersion] = useState("ALL");
  const [edition, setEdition] = useState("ALL");
  const { data, isLoading, isError, refetch } = usePublicCampaigns();
  const campaigns = data?.items ?? [];
  const categories = useMemo(
    () => [
      "ALL",
      ...new Set([
        ...serverTypes,
        ...campaigns.map((campaign) => campaign.category).filter(Boolean),
        ...campaigns.flatMap((campaign) => campaign.server.categories),
      ]),
    ],
    [campaigns],
  );
  const versions = minecraftMajorVersions;
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
      ]
        .join(" ")
        .toLowerCase();
      return (
        (category === "ALL" ||
          campaign.category === category ||
          campaign.server.categories.includes(category)) &&
        (version === "ALL" ||
          campaign.versionRequirements.some(
            (item) => item === version || item.startsWith(`${version}.`),
          ) ||
          campaign.server.versions.some(
            (item) => item === version || item.startsWith(`${version}.`),
          )) &&
        (edition === "ALL" || campaign.server.edition === edition) &&
        (!query || searchableText.includes(query))
      );
    });
    return [...filtered].sort((left, right) => {
      if (tab === "Highest Sparks limit")
        return right.maximumSparksReward - left.maximumSparksReward;
      if (tab === "Ending soon")
        return new Date(left.endsAt).getTime() - new Date(right.endsAt).getTime();
      return new Date(right.startsAt).getTime() - new Date(left.startsAt).getTime();
    });
  }, [campaigns, category, edition, search, tab, version]);
  return (
    <div className="dashboard-page">
      <PageHeading title={t("ui.campaigns")} description={t("ui.campaignDescription")} />
      <div className="dashboard-filter campaign-filters">
        <label>
          <Search />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("ui.searchCampaigns")}
          />
        </label>
        <select
          aria-label={t("ui.allCategories")}
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        >
          {categories.map((item) => (
            <option value={item} key={item}>
              {item === "ALL" ? t("ui.allCategories") : item}
            </option>
          ))}
        </select>
        <select
          aria-label={t("ui.allVersions")}
          value={version}
          onChange={(event) => setVersion(event.target.value)}
        >
          <option value="ALL">{t("ui.allVersions")}</option>
          {versions.map((item) => (
            <option value={item} key={item}>
              {item}
            </option>
          ))}
        </select>
        <select
          aria-label={t("ui.allEditions")}
          value={edition}
          onChange={(event) => setEdition(event.target.value)}
        >
          <option value="ALL">{t("ui.allEditions")}</option>
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
        {isLoading ? (
          <Card className="directory-status-card">
            <p>Loading seeded campaigns…</p>
          </Card>
        ) : null}
        {isError ? (
          <Card className="directory-status-card">
            <p>{t("listing.campaignError")}</p>
            <Button onClick={() => refetch()}>{t("ui.retry")}</Button>
          </Card>
        ) : null}
        {!isLoading && !isError && visibleCampaigns.length === 0 ? (
          <Card className="directory-status-card">
            <p>{t("ui.noCampaigns")}</p>
          </Card>
        ) : null}
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

/* Removed IRL cash-out UI. Sparks are non-withdrawable platform points.
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
*/

export function QuestsPage() {
  const { data, isLoading, isError, refetch } = useDailyQuests();
  const quests = data ?? [];
  const recurringQuests = quests.filter((quest) => quest.cadence === "DAILY");
  const accountQuests = quests.filter((quest) => quest.cadence !== "DAILY");
  const questIcons = {
    ACCOUNT_CREATED: UserPlus,
    MINECRAFT_ACCOUNT_LINKED: Link2,
    CAMPAIGN_COMPLETED: Target,
    SERVER_VOTED: ThumbsUp,
    VERIFIED_SERVER_JOINED: ShieldCheck,
    DISCORD_JOIN: MessageSquareText,
    LOGIN_STREAK: Flame,
    SPARKS_SHOP_PURCHASED: Sparkles,
    FRIEND_REFERRAL: Users,
    SERVER_REVIEW_WRITTEN: MessageSquareText,
  } as const;
  const totalPotentialSparks = recurringQuests.reduce(
    (total, quest) => total + quest.sparksReward,
    0,
  );
  const completedQuests = recurringQuests.filter((quest) => quest.completedAt).length;
  return (
    <div className="dashboard-page">
      <PageHeading
        title="Quests"
        description="Complete optional platform activities that may qualify for Sparks."
      />
      <Card className="quest-hero">
        <div>
          <Badge tone="purple">DAILY SET</Badge>
          <h2>
            {recurringQuests.length} daily quests · up to {totalPotentialSparks} Sparks may be available
          </h2>
          <p>
            Daily progress resets at 00:00 UTC. Sign in to receive Sparks only after the backend
            verifies the activity.
          </p>
        </div>
        <div className="streak-large">
          <Flame />
          <strong>{completedQuests}</strong>
          <span>completed today</span>
        </div>
      </Card>
      <div className="quest-grid">
        {isLoading ? (
          <Card>
            <p>Loading seeded quests…</p>
          </Card>
        ) : null}
        {isError ? (
          <Card>
            <p>Seeded quests could not be loaded.</p>
            <Button onClick={() => refetch()}>Retry</Button>
          </Card>
        ) : null}
        {recurringQuests.map((quest) => {
          const Icon = questIcons[quest.type as keyof typeof questIcons] ?? Target;
          return (
            <Card key={quest.id}>
              <span className="quest-icon">
                <Icon />
              </span>
              <Badge tone={quest.verificationPending ? "warning" : "purple"}>
                {quest.verificationPending
                  ? "Verification pending"
                  : `${quest.sparksReward} Sparks`}
              </Badge>
              <h3>{quest.title}</h3>
              <p>{quest.description}</p>
              <ProgressBar
                value={(quest.progress / quest.target) * 100}
                label={`${quest.progress} of ${quest.target}`}
              />
            </Card>
          );
        })}
      </div>
      {accountQuests.length ? (
        <>
          <PageHeading
            eyebrow="ACCOUNT PROGRESS"
            title="One-time quests"
            description="These verified account milestones do not reset each day."
          />
          <div className="quest-grid">
            {accountQuests.map((quest) => {
              const Icon = questIcons[quest.type as keyof typeof questIcons] ?? Target;
              return (
                <Card key={quest.id}>
                  <span className="quest-icon"><Icon /></span>
                  <Badge tone={quest.verificationPending ? "warning" : "neutral"}>
                    {quest.verificationPending ? "Verification pending" : `${quest.sparksReward} Sparks`}
                  </Badge>
                  <h3>{quest.title}</h3>
                  <p>{quest.description}</p>
                  <ProgressBar value={(quest.progress / quest.target) * 100} label={`${quest.progress} of ${quest.target}`} />
                </Card>
              );
            })}
          </div>
        </>
      ) : null}
    </div>
  );
}

export function SparksShopPage() {
  const {
    data: cosmeticCollection,
    isLoading,
    isError,
    refetch,
  } = useProfileCosmetics();
  const {
    data: sparksSummary,
    isLoading: sparksLoading,
    refetch: refetchSparks,
  } = useSparksSummary();
  const { data: sponsoredStores = [], refetch: refetchSponsoredStores } = useSponsoredStores();
  const { data: sponsoredPurchases = [], refetch: refetchSponsoredPurchases } =
    useSponsoredPurchases();
  const cosmetics =
    cosmeticCollection?.items.filter((item) => item.unlockMethod === "SPARKS") ?? [];
  const balance = sparksSummary?.balance ?? 0;
  const [selected, setSelected] = useState<ProfileCosmeticItem | null>(null);
  const [cosmeticBusy, setCosmeticBusy] = useState(false);
  const [category, setCategory] = useState("ALL");
  const [purchaseMessage, setPurchaseMessage] = useState("");
  const [selectedSponsored, setSelectedSponsored] = useState<{
    store: SponsoredStore;
    item: SponsoredItem;
  } | null>(null);
  const [sponsoredDetails, setSponsoredDetails] = useState<Record<string, string>>({});
  const [sponsoredQuantity, setSponsoredQuantity] = useState(1);
  const [sponsoredAttemptKey, setSponsoredAttemptKey] = useState("");
  const [sponsoredMessage, setSponsoredMessage] = useState("");
  const [sponsoredBusy, setSponsoredBusy] = useState(false);
  const [insufficientPurchase, setInsufficientPurchase] = useState<{
    itemName: string;
    required: number;
    available: number;
  } | null>(null);
  const fulfillmentField = {
    MINECRAFT_USERNAME: {
      key: "minecraftUsername",
      label: "Minecraft username",
      type: "text",
    },
    DISCORD_USERNAME: { key: "discordUsername", label: "Discord username", type: "text" },
    EMAIL: { key: "email", label: "Delivery email", type: "email" },
  } as const;
  const selectedSponsoredTotal = selectedSponsored
    ? sparksPurchaseTotal(selectedSponsored.item.sparksPrice, sponsoredQuantity)
    : 0;
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
          <h3>Earn Sparks to Spend on the Shop</h3>
          <p>
            Complete daily quests and eligible playtest activities to receive Sparks after
            verification, then spend them on items in the shop.
          </p>
        </div>
      </Card>
      <div className="shop-tabs">
        {([
          ["ALL", "All"],
          ["AVATAR", "Avatars"],
          ["BANNER", "Banners"],
          ["BADGE", "Badges"],
          ["TITLE", "Titles"],
          ["THEME", "Themes"],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            className={category === value ? "active" : ""}
            onClick={() => setCategory(value)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="cosmetic-grid">
        {isLoading ? (
          <Card>
            <p>Loading seeded cosmetics…</p>
          </Card>
        ) : null}
        {isError ? (
          <Card>
            <p>Seeded cosmetics could not be loaded.</p>
            <Button onClick={() => refetch()}>Retry</Button>
          </Card>
        ) : null}
        {cosmetics
          .filter((item) => category === "ALL" || item.type === category)
          .map((item) => (
            <Card key={item.id} className="cosmetic-card">
              <div
                className="cosmetic-preview"
                style={{
                  backgroundColor: String(item.preview.primary ?? item.preview.color ?? "") || undefined,
                  "--cosmetic-primary": String(item.preview.primary ?? "#17382e"),
                  "--cosmetic-accent": String(item.preview.accent ?? "#98e66e"),
                } as React.CSSProperties}
              >
                <CosmeticGlyph
                  item={{
                    preview: {
                      primary: String(item.preview.primary ?? "#17382e"),
                      accent: String(item.preview.accent ?? "#98e66e"),
                      icon: String(item.preview.icon ?? "sparkles"),
                      pattern: "plain",
                    },
                  }}
                />
                <Badge tone={item.rarity === "EPIC" ? "purple" : "neutral"}>{item.rarity}</Badge>
              </div>
              <div>
                <small>{item.type.replaceAll("_", " ")}</small>
                <h3>{item.name}</h3>
                <button
                  disabled={sparksLoading}
                  onClick={() => {
                    setPurchaseMessage("");
                    setSelected(item);
                  }}
                >
                  {item.purchased ? (
                    "View · Owned"
                  ) : (
                    <Sparks value={item.sparksPrice.toLocaleString()} />
                  )}
                </button>
              </div>
            </Card>
          ))}
      </div>
      <PageHeading
        eyebrow="NORTIX SPONSORED"
        title="Gifts from Nortix Labs"
        description="Use Sparks to request selected third-party digital gifts supplied by Nortix Labs."
      />
      <Card className="sparks-disclaimer">
        <Gift />
        <div>
          <h3>These are gifts from Nortix Labs.</h3>
          <p>
            Nortix Labs independently purchases and delivers eligible gifts. Nortix is not
            affiliated with, endorsed by, or partnered with the stores or brands shown here.
            Product names and trademarks belong to their respective owners.
          </p>
        </div>
      </Card>
      <div className="sponsored-store-list">
        {sponsoredStores.map((store) => (
          <section className="sponsored-store" key={store.id}>
            <div className="sponsored-store__heading">
              {store.logoUrl ? <img src={store.logoUrl} alt="" /> : <Gift />}
              <div>
                <h3>{store.name}</h3>
                <p>{store.description}</p>
                <small>Gifts supplied by Nortix Labs · no affiliation with {store.name}</small>
              </div>
            </div>
            <div className="cosmetic-grid">
              {store.items.map((item) => (
                <Card className="sponsored-item-card" key={item.id}>
                  {item.imageUrl ? <img src={item.imageUrl} alt="" /> : <Gift />}
                  <div>
                    <small>{store.name}</small>
                    <h3>{item.name}</h3>
                    <p>{item.description}</p>
                    <span>{item.fulfillmentSummary}</span>
                    <Button
                      disabled={sparksLoading}
                      onClick={() => {
                        setSelectedSponsored({ store, item });
                        setSponsoredDetails({});
                        setSponsoredQuantity(1);
                        setSponsoredAttemptKey(crypto.randomUUID());
                        setSponsoredMessage("");
                      }}
                    >
                      Request gift · <Sparks value={item.sparksPrice.toLocaleString()} />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        ))}
      </div>
      {sponsoredStores.length === 0 ? (
        <Card>
          <p>No Nortix-sponsored gifts are available right now.</p>
        </Card>
      ) : null}
      {sponsoredPurchases.length ? (
        <>
          <PageHeading
            eyebrow="PRIVATE TO YOUR ACCOUNT"
            title="Your sponsored gift requests"
            description="Only you and authorized Nortix administrators can view delivery details."
          />
          <div className="sponsored-purchase-list">
            {sponsoredPurchases.map((purchase) => (
              <Card key={purchase.id}>
                <div>
                  <small>{purchase.item.store.name}</small>
                  <h3>{purchase.item.name}</h3>
                  <p>
                    Quantity {purchase.quantity} · Requested{" "}
                    {new Date(purchase.createdAt).toLocaleString()}
                  </p>
                </div>
                <Badge
                  tone={
                    purchase.status === "DELIVERED"
                      ? "success"
                      : purchase.status === "REFUNDED" || purchase.status === "CANCELLED"
                        ? "neutral"
                        : "warning"
                  }
                >
                  {purchase.status.replaceAll("_", " ")}
                </Badge>
                {purchase.deliveryReference ? (
                  <div className="sponsored-delivery">
                    <strong>Private delivery</strong>
                    <code>{purchase.deliveryReference}</code>
                  </div>
                ) : null}
                {purchase.statusReason ? <small>{purchase.statusReason}</small> : null}
              </Card>
            ))}
          </div>
        </>
      ) : null}
      {selected && (
        <Modal
          title={selected.name}
          className="modal--compact sparks-purchase-modal"
          onClose={() => setSelected(null)}
        >
          <div className="modal__body sparks-purchase-dialog">
            <div
              className="cosmetic-preview cosmetic-preview--modal"
              style={{
                backgroundColor: String(selected.preview.primary ?? selected.preview.color ?? "") || undefined,
                "--cosmetic-primary": String(selected.preview.primary ?? "#17382e"),
                "--cosmetic-accent": String(selected.preview.accent ?? "#98e66e"),
              } as React.CSSProperties}
            >
              <CosmeticGlyph
                item={{
                  preview: {
                    primary: String(selected.preview.primary ?? "#17382e"),
                    accent: String(selected.preview.accent ?? "#98e66e"),
                    icon: String(selected.preview.icon ?? "sparkles"),
                    pattern: "plain",
                  },
                }}
              />
            </div>
            <div className="sparks-purchase-dialog__copy">
              <Badge tone={selected.rarity === "EPIC" ? "purple" : "neutral"}>
                {selected.type} · {selected.rarity}
              </Badge>
              <p>{selected.description}</p>
            </div>
            <div className="sparks-purchase-dialog__quantity">
              <span>
                <strong>Quantity</strong>
                <small>Permanent cosmetic unlocks can only be purchased once.</small>
              </span>
              <input aria-label="Quantity" type="number" value={1} min={1} max={1} disabled />
            </div>
            <div className="withdraw-summary">
              <span>
                Price <b>{selected.sparksPrice.toLocaleString()} Sparks</b>
              </span>
              <span>
                {selected.purchased ? "Status" : "Remaining Sparks"}
                <strong>
                  {selected.purchased
                    ? "Owned"
                    : Math.max(0, balance - selected.sparksPrice).toLocaleString()}
                </strong>
              </span>
            </div>
            {purchaseMessage ? <p role="status">{purchaseMessage}</p> : null}
          </div>
          <div className="modal__footer">
            <Button variant="ghost" onClick={() => setSelected(null)}>
              Cancel
            </Button>
            <Button
              disabled={cosmeticBusy || selected.purchased}
              onClick={async () => {
                if (balance < selected.sparksPrice) {
                  setSelected(null);
                  setInsufficientPurchase({
                    itemName: selected.name,
                    required: selected.sparksPrice,
                    available: balance,
                  });
                  return;
                }
                setCosmeticBusy(true);
                setPurchaseMessage("");
                try {
                  await api("/sparks/purchases", {
                    method: "POST",
                    body: JSON.stringify({ itemId: selected.id }),
                  });
                  await refetchSparks();
                  await refetch();
                  setSelected(null);
                } catch (error) {
                  if (isInsufficientSparksError(error)) {
                    const refreshed = await refetchSparks();
                    setSelected(null);
                    setInsufficientPurchase({
                      itemName: selected.name,
                      required: selected.sparksPrice,
                      available: refreshed.data?.balance ?? balance,
                    });
                  } else {
                    setPurchaseMessage(
                      error instanceof Error ? error.message : "The cosmetic could not be unlocked.",
                    );
                  }
                } finally {
                  setCosmeticBusy(false);
                }
              }}
            >
              {selected.purchased
                ? "Already owned"
                : cosmeticBusy
                  ? "Purchasing…"
                  : "Purchase · 1 item"}
            </Button>
          </div>
        </Modal>
      )}
      {selectedSponsored ? (
        <Modal
          title={`Request ${selectedSponsored.item.name}`}
          className="modal--compact sparks-purchase-modal"
          onClose={() => setSelectedSponsored(null)}
        >
          <form
            className="modal__body form-grid"
            onSubmit={async (event) => {
              event.preventDefault();
              if (balance < selectedSponsoredTotal) {
                setSelectedSponsored(null);
                setInsufficientPurchase({
                  itemName: selectedSponsored.item.name,
                  required: selectedSponsoredTotal,
                  available: balance,
                });
                return;
              }
              setSponsoredBusy(true);
              setSponsoredMessage("");
              try {
                await api("/sparks/sponsored-purchases", {
                  method: "POST",
                  body: JSON.stringify({
                    itemId: selectedSponsored.item.id,
                    idempotencyKey: sponsoredAttemptKey,
                    quantity: sponsoredQuantity,
                    fulfillmentDetails: sponsoredDetails,
                  }),
                });
                await Promise.all([
                  refetchSparks(),
                  refetchSponsoredStores(),
                  refetchSponsoredPurchases(),
                ]);
                setSelectedSponsored(null);
              } catch (error) {
                if (isInsufficientSparksError(error)) {
                  const refreshed = await refetchSparks();
                  setSelectedSponsored(null);
                  setInsufficientPurchase({
                    itemName: selectedSponsored.item.name,
                    required: selectedSponsoredTotal,
                    available: refreshed.data?.balance ?? balance,
                  });
                } else {
                  setSponsoredMessage(
                    error instanceof Error
                      ? error.message
                      : "The gift request could not be created.",
                  );
                }
              } finally {
                setSponsoredBusy(false);
              }
            }}
          >
            <div className="sparks-purchase-dialog__image">
              {selectedSponsored.item.imageUrl ? (
                <img src={selectedSponsored.item.imageUrl} alt="" />
              ) : (
                <Gift />
              )}
            </div>
            <div className="sparks-purchase-dialog__copy">
              <Badge tone="neutral">{selectedSponsored.store.name}</Badge>
              <p>{selectedSponsored.item.description}</p>
            </div>
            <div className="sparks-disclaimer">
              <Gift />
              <p>
                Nortix Labs supplies this as an independent gift. Nortix is not affiliated with or
                endorsed by {selectedSponsored.store.name}.
              </p>
            </div>
            <label className="sparks-purchase-dialog__quantity">
              <span>
                <strong>Quantity</strong>
                <small>Choose between 1 and {maxSponsoredPurchaseQuantity} units.</small>
              </span>
              <input
                aria-label="Quantity"
                type="number"
                min={1}
                max={maxSponsoredPurchaseQuantity}
                value={sponsoredQuantity}
                onChange={(event) => {
                  const quantity = Math.min(
                    maxSponsoredPurchaseQuantity,
                    Math.max(1, Math.trunc(event.currentTarget.valueAsNumber || 1)),
                  );
                  setSponsoredQuantity(quantity);
                  setSponsoredAttemptKey(crypto.randomUUID());
                }}
              />
            </label>
            {selectedSponsored.item.fulfillmentFields.map((field) => {
              const config = fulfillmentField[field];
              return (
                <label key={field}>
                  {config.label}
                  <input
                    required
                    type={config.type}
                    value={sponsoredDetails[config.key] ?? ""}
                    onChange={(event) =>
                      setSponsoredDetails((current) => ({
                        ...current,
                        [config.key]: event.target.value,
                      }))
                    }
                  />
                </label>
              );
            })}
            <div className="withdraw-summary">
              <span>
                Unit price
                <b>{selectedSponsored.item.sparksPrice.toLocaleString()} Sparks</b>
              </span>
              <span>
                Total <strong>{selectedSponsoredTotal.toLocaleString()} Sparks</strong>
              </span>
              <span>
                Remaining Sparks{" "}
                <strong>{Math.max(0, balance - selectedSponsoredTotal).toLocaleString()}</strong>
              </span>
            </div>
            <small>
              Delivery is reviewed manually and is not guaranteed until marked delivered. If
              Nortix refunds the request, the Sparks return to your account.
            </small>
            {sponsoredMessage ? <p role="status">{sponsoredMessage}</p> : null}
            <div className="modal__footer">
              <Button variant="ghost" type="button" onClick={() => setSelectedSponsored(null)}>
                Cancel
              </Button>
              <Button disabled={sponsoredBusy} type="submit">
                {sponsoredBusy
                  ? "Requesting…"
                  : `Purchase ${sponsoredQuantity.toLocaleString()} ${sponsoredQuantity === 1 ? "item" : "items"}`}
              </Button>
            </div>
          </form>
        </Modal>
      ) : null}
      {insufficientPurchase ? (
        <Modal
          title="Not Enough Sparks"
          className="modal--compact"
          onClose={() => setInsufficientPurchase(null)}
        >
          <div className="modal__body insufficient-sparks-dialog">
            <span className="insufficient-sparks-dialog__icon">
              <Sparkles />
            </span>
            <div>
              <h3>You need more Sparks for {insufficientPurchase.itemName}.</h3>
              <p>
                Sparks are non-withdrawable platform points. Complete eligible activities and
                verified quests to build your balance.
              </p>
            </div>
            <div className="withdraw-summary">
              <span>
                Available <b>{insufficientPurchase.available.toLocaleString()}</b>
              </span>
              <span>
                Required <strong>{insufficientPurchase.required.toLocaleString()}</strong>
              </span>
              <span>
                Still needed
                <strong>
                  {Math.max(
                    0,
                    insufficientPurchase.required - insufficientPurchase.available,
                  ).toLocaleString()}
                </strong>
              </span>
            </div>
          </div>
          <div className="modal__footer">
            <Button variant="ghost" onClick={() => setInsufficientPurchase(null)}>
              Close
            </Button>
            <Link
              className="button button--primary"
              to="/dashboard/quests"
              onClick={() => setInsufficientPurchase(null)}
            >
              View quests
            </Link>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

export function VotingPage() {
  const [searchParams] = useSearchParams();
  const { data, isLoading, isError, refetch } = useVotingServers();
  const linkedServerId = searchParams.get("server")?.trim() ?? "";
  const [selectedId, setSelectedId] = useState(linkedServerId);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [resetKey, setResetKey] = useState(0);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<"" | "standard" | "rewarded">("");
  const selected = data?.servers.find((server) => server.id === selectedId);
  const rewardedVoteAvailable = Boolean(
    data?.rewardedAdsAvailable && selected?.rewardedVotingEnabled,
  );
  const limitReached = (data?.votesUsed ?? 0) >= (data?.dailyLimit ?? 5);

  const submitVote = async () => {
    if (!selectedId || !turnstileToken || busy) return;
    setBusy("standard");
    setMessage("");
    try {
      await api(`/servers/${selectedId}/vote`, {
        method: "POST",
        body: JSON.stringify({ vote: true, turnstileToken }),
      });
      setMessage(`Your vote for ${selected?.name ?? "this server"} is counted.`);
      await refetch();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Your vote could not be counted.");
    } finally {
      setBusy("");
      setTurnstileToken("");
      setResetKey((value) => value + 1);
    }
  };

  const submitRewardedVote = async () => {
    if (!selectedId || !selected || !rewardedVoteAvailable || !turnstileToken || busy) return;
    setBusy("rewarded");
    setMessage("Preparing a rewarded ad…");
    try {
      const session = await api<{
        sessionId: string;
        token: string;
        adUnitPath: string;
      }>(`/servers/${selectedId}/rewarded-vote-sessions`, {
        method: "POST",
        body: JSON.stringify({ turnstileToken }),
      });
      const adResult = await showGoogleRewardedAd(session.adUnitPath);
      if (adResult !== "granted") {
        setMessage(
          adResult === "closed"
            ? "The ad was closed before completion, so no vote was cast."
            : "No rewarded ad is available right now. You can still cast a standard vote.",
        );
        return;
      }
      await api(`/servers/${selectedId}/rewarded-vote-sessions/${session.sessionId}/grant`, {
        method: "POST",
        body: JSON.stringify({ token: session.token }),
      });
      setMessage(`Your vote for ${selected.name} was counted as 2 votes.`);
      await refetch();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Your rewarded vote could not be counted.",
      );
    } finally {
      setBusy("");
      setTurnstileToken("");
      setResetKey((value) => value + 1);
    }
  };

  return (
    <div className="dashboard-page voting-page">
      <PageHeading
        eyebrow="DAILY VOTING"
        title="Vote for a verified server"
        description="Support servers with a recently connected Nortix plugin. Each account may vote for up to five different servers per UTC day."
        action={
          <div className="balance-pill">
            <ThumbsUp /> <strong>{data?.votesUsed ?? 0} / {data?.dailyLimit ?? 5}</strong> used
          </div>
        }
      />
      <Card className="voting-explainer">
        <ShieldCheck />
        <div>
          <h3>Only live, Nortix-verified integrations appear here.</h3>
          <p>One vote per server each day. Your first eligible vote today may complete the 5 Sparks daily quest after backend verification.</p>
        </div>
      </Card>
      {isLoading ? <Card><p>Loading eligible servers…</p></Card> : null}
      {isError ? <Card><p>Eligible servers could not be loaded.</p><Button onClick={() => refetch()}>Retry</Button></Card> : null}
      {!isLoading && !isError && linkedServerId && !selected ? (
        <Card>
          <p>
            This voting link does not match a currently eligible Nortix-verified server. The
            integration may be offline or the link may be outdated.
          </p>
        </Card>
      ) : null}
      <div className="voting-server-grid">
        {data?.servers.map((server) => (
          <button
            type="button"
            key={server.id}
            className={`voting-server-card ${selectedId === server.id ? "is-selected" : ""}`}
            disabled={server.votedToday || limitReached}
            onClick={() => {
              setSelectedId(server.id);
              setMessage("");
            }}
          >
            <span className="voting-server-logo">{server.logoUrl ? <img src={server.logoUrl} alt="" /> : <ServerCog />}</span>
            <span>
              <strong>{server.name}</strong>
              <small>
                {server.playerCount ?? 0} online · {server.voteCount.toLocaleString()} votes
                {data.rewardedAdsAvailable && server.rewardedVotingEnabled ? " · 2× option" : ""}
              </small>
            </span>
            <Badge tone={server.votedToday ? "neutral" : "purple"}>
              {server.votedToday ? "Voted today" : "Select"}
            </Badge>
          </button>
        ))}
      </div>
      {!isLoading && data?.servers.length === 0 ? (
        <Card><p>No verified servers have a recent plugin heartbeat right now. Check back soon.</p></Card>
      ) : null}
      <Card className="vote-submit-card">
        <div>
          <small>SELECTED SERVER</small>
          <h3>{selected?.name ?? "Choose a server above"}</h3>
        </div>
        <TurnstileWidget resetKey={resetKey} onToken={setTurnstileToken} />
        <div className="vote-submit-actions">
          <Button disabled={!selected || selected.votedToday || !turnstileToken || Boolean(busy) || limitReached} onClick={() => void submitVote()}>
            <ThumbsUp /> {busy === "standard" ? "Voting…" : "Cast 1 vote"}
          </Button>
          {rewardedVoteAvailable ? (
            <Button
              variant="secondary"
              disabled={selected?.votedToday || !turnstileToken || Boolean(busy) || limitReached}
              onClick={() => void submitRewardedVote()}
            >
              <Gift /> {busy === "rewarded" ? "Preparing ad…" : "Watch an ad for a 2× vote"}
            </Button>
          ) : null}
        </div>
        {rewardedVoteAvailable ? (
          <small>
            Optional: complete one Google-served rewarded ad to cast one vote worth 2 votes. You
            can cast a standard vote without watching an ad.
          </small>
        ) : null}
        {message ? <p role="status">{message}</p> : null}
      </Card>
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
        {isLoading ? (
          <Card>
            <p>Loading seeded leaderboard…</p>
          </Card>
        ) : null}
        {isError ? (
          <Card>
            <p>The seeded leaderboard could not be loaded.</p>
            <Button onClick={() => refetch()}>Retry</Button>
          </Card>
        ) : null}
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
  const { data: invites = [], isLoading, isError, refetch } = useReferrals();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(() => {
    const value = sessionStorage.getItem("nortix-referral-message") ?? "";
    sessionStorage.removeItem("nortix-referral-message");
    return value;
  });
  const openInvite = invites.find((invite) => invite.status === "OPEN");
  const openInviteUrl = openInvite
    ? referralRegistrationUrl(window.location.origin, openInvite.code)
    : null;
  const registered = invites.filter((invite) =>
    ["REGISTERED", "QUALIFIED"].includes(invite.status),
  ).length;
  const qualified = invites.filter((invite) => invite.status === "QUALIFIED").length;
  const currentMonthStart = new Date();
  currentMonthStart.setUTCDate(1);
  currentMonthStart.setUTCHours(0, 0, 0, 0);
  const monthlyInvites = invites.filter(
    (invite) => new Date(invite.createdAt) >= currentMonthStart,
  ).length;
  const monthlyInviteLimitReached = monthlyInvites >= maxFriendReferralInvitesPerMonth;

  const createInvite = async () => {
    setBusy(true);
    setMessage("");
    try {
      await api("/referrals", { method: "POST", body: "{}" });
      await refetch();
      setMessage("A new single-use registration link is ready to share.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The invite could not be created.");
    } finally {
      setBusy(false);
    }
  };

  const copyInvite = async () => {
    if (!openInviteUrl) return;
    try {
      await navigator.clipboard.writeText(openInviteUrl);
      setMessage("Registration link copied.");
    } catch {
      setMessage(`Copy this registration link: ${openInviteUrl}`);
    }
  };

  return (
    <div className="dashboard-page">
      <PageHeading
        title="Invite a friend"
        description="Create a single-use invite and track its qualification without exposing private account details."
      />
      <Card className="referral-hero">
        <div>
          <Badge tone="purple">FRIEND INVITES</Badge>
          <h2>Invite a friend to Nortix.</h2>
          <p>
            Your invite qualifies after your friend registers through the link and earns at least
            200 Sparks during their first {friendReferralEarningWindowDays} days. Your Invite a
            friend quest may then receive 50 Sparks after backend verification. You can create up
            to {maxFriendReferralInvitesPerMonth} single-use links per calendar month.
          </p>
          {openInviteUrl ? (
            <div className="referral-code">
              <code>{openInviteUrl}</code>
              <Button onClick={copyInvite}>
                <Copy /> Copy registration link
              </Button>
            </div>
          ) : (
            <Button onClick={createInvite} disabled={busy || monthlyInviteLimitReached}>
              <UserPlus /> {busy ? "Creating…" : "Create registration link"}
            </Button>
          )}
          {message ? (
            <p className="referral-message" role="status">
              {message}
            </p>
          ) : null}
        </div>
        <UserPlus />
      </Card>
      <div className="quick-stats">
        <Card>
          <span className="stat-icon stat-icon--purple">
            <Users />
          </span>
          <div>
            <small>Links this month</small>
            <strong>
              {monthlyInvites} / {maxFriendReferralInvitesPerMonth}
            </strong>
            <span>{registered} registered overall</span>
          </div>
        </Card>
        <Card>
          <span className="stat-icon stat-icon--green">
            <Sparkles />
          </span>
          <div>
            <small>Qualified invites</small>
            <strong>{qualified}</strong>
            <span>Reached 200 earned Sparks</span>
          </div>
        </Card>
        <Card>
          <span className="stat-icon stat-icon--blue">
            <Gift />
          </span>
          <div>
            <small>Quest eligibility</small>
            <strong>{qualified ? "Verified" : "Pending"}</strong>
            <span>May receive 50 Sparks once</span>
          </div>
        </Card>
      </div>
      <Card className="referral-creator">
        <div>
          <Badge tone="purple">CONTENT CREATOR?</Badge>
          <h2>Build with the Nortix Creator Platform.</h2>
          <p>
            Apply for a creator referral link and exclusive creator tools within Nortix Hub.
            Applications are reviewed by the Nortix team.
          </p>
        </div>
        <a
          className="button button--ghost"
          href="mailto:contact@nortixlabs.com?subject=Nortix%20Creator%20Platform%20Application"
        >
          Apply as a creator <ArrowRight />
        </a>
      </Card>
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
                <th>Invite</th>
                <th>Created</th>
                <th>Status</th>
                <th>Qualification progress</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={4}>Loading invites…</td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={4}>Invite history could not be loaded.</td>
                </tr>
              ) : invites.length === 0 ? (
                <tr>
                  <td colSpan={4}>No invites yet. Create one when you are ready to share it.</td>
                </tr>
              ) : (
                invites.map((invite) => (
                  <tr key={invite.id}>
                    <td>
                      <strong>{invite.label}</strong>
                    </td>
                    <td>{new Date(invite.createdAt).toLocaleDateString()}</td>
                    <td>
                      <StatusChip status={invite.status} />
                    </td>
                    <td>
                      {invite.status === "OPEN"
                        ? "Waiting for registration"
                        : invite.status === "EXPIRED"
                          ? "Invite expired"
                          : !invite.earningWindowActive && invite.status !== "QUALIFIED"
                            ? `${Math.min(invite.creditedSparks, invite.requiredSparks)} of ${invite.requiredSparks} Sparks · 30-day window ended`
                            : `${Math.min(invite.creditedSparks, invite.requiredSparks)} of ${invite.requiredSparks} Sparks`}
                    </td>
                  </tr>
                ))
              )}
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
  const [claim, setClaim] = useState<{
    code: string;
    expiresAt: string;
    verificationServer: string;
  }>();
  const [claimOpen, setClaimOpen] = useState(false);
  const [serverId, setServerId] = useState("");
  const [crackedName, setCrackedName] = useState("");
  const [identityMessage, setIdentityMessage] = useState("");
  const [identityBusy, setIdentityBusy] = useState(false);
  const [profileEditOpen, setProfileEditOpen] = useState(false);
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [cosmeticType, setCosmeticType] = useState<ProfileCosmeticType>("AVATAR");
  const [cosmeticBusy, setCosmeticBusy] = useState<string>();
  const [serverOwnerMode, setServerOwnerMode] = useState(() => readRolePreference() === "owner");
  const [profileDraft, setProfileDraft] = useState({
    username: "",
    displayName: "",
    bio: "",
    backgroundColor: "slate" as "slate" | "violet" | "ocean" | "moss" | "ember",
    isPublic: true,
    showReputation: true,
  });
  const { data: currentUser } = useCurrentUser();
  const { data: cosmetics, refetch: refetchCosmetics } = useProfileCosmetics();
  const { data: profileActivity } = useProfileActivity();
  const { data: sparksSummary, refetch: refetchSparks } = useSparksSummary();
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const { data: participations = [] } = useParticipations();
  const approvedMilestones = participations.reduce(
    (total, participation) =>
      total + participation.completions.filter((item) => item.status === "VERIFIED").length,
    0,
  );
  const cosmeticItems = cosmetics?.items.filter((item) => item.type === cosmeticType) ?? [];
  const equippedBanner = cosmetics?.items.find((item) => item.type === "BANNER" && item.equipped);
  const equippedAvatar = cosmetics?.items.find((item) => item.type === "AVATAR" && item.equipped);
  const equippedBadge = cosmetics?.items.find((item) => item.type === "BADGE" && item.equipped);
  const equippedTitle = cosmetics?.items.find((item) => item.type === "TITLE" && item.equipped);
  const equippedTheme = cosmetics?.items.find((item) => item.type === "THEME" && item.equipped);
  const levelUnlocks =
    cosmetics?.items
      .filter((item) => item.unlockMethod === "LEVEL" && item.requiredLevel !== null)
      .sort((left, right) => left.requiredLevel! - right.requiredLevel!)
      .slice(0, 5) ?? [];
  const testerLevel = currentUser?.testerLevel ?? 1;
  const testerExperience = cosmetics?.testerExperience ?? currentUser?.testerExperience ?? 0;
  const currentLevelExperience = cosmetics?.currentLevelExperience ?? 0;
  const nextLevelExperience = cosmetics?.nextLevelExperience ?? 1_000;
  const levelXpEarned = Math.max(0, testerExperience - currentLevelExperience);
  const levelXpRequired = Math.max(1, nextLevelExperience - currentLevelExperience);
  const levelXpPercent = Math.min(100, (levelXpEarned / levelXpRequired) * 100);
  const gameplay = profileActivity?.gameplay;
  const maxDailyPlayMinutes = Math.max(
    1,
    ...(gameplay?.daily.map((day) => day.playMinutes) ?? [0]),
  );
  const actionMix = [
    { label: "Blocks broken", value: gameplay?.totals.blocksBroken ?? 0, icon: Mountain },
    { label: "Mobs defeated", value: gameplay?.totals.mobsDefeated ?? 0, icon: Target },
    { label: "Player wins", value: gameplay?.totals.playerWins ?? 0, icon: Zap },
  ];
  const maxActionValue = Math.max(1, ...actionMix.map((item) => item.value));

  const refreshIdentities = async () => {
    const result = await api<IdentityData>("/minecraft-identities");
    setIdentityData(result);
  };

  useEffect(() => {
    refreshIdentities().catch((error: Error) => setIdentityMessage(error.message));
    api<{ items: ServerOption[] }>("/servers?pageSize=50")
      .then((result) => {
        setServerOptions(result.items);
        setServerId(
          (current) =>
            current || result.items.find((item) => item.crackedAccountLinkingAvailable)?.id || "",
        );
      })
      .catch(() => undefined);
  }, []);

  const createPremiumClaim = async () => {
    setIdentityBusy(true);
    setIdentityMessage("");
    try {
      const newClaim = await api<{ code: string; expiresAt: string; verificationServer: string }>(
        "/minecraft-identities/premium/claims",
        { method: "POST", body: "{}" },
      );
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
    const warning =
      kind === "cracked" && activated
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
        await navigator.share({
          title: `${currentUser.displayName ?? currentUser.username} on Nortix`,
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        setProfileMessage("Profile link copied.");
      }
    } catch {
      setProfileMessage("Profile sharing was cancelled.");
    }
  };

  const toggleServerOwnerMode = () => {
    const next = !serverOwnerMode;
    setServerOwnerMode(next);
    saveRolePreference(next ? "owner" : "player");
  };

  const selectCosmetic = async (item: ProfileCosmeticItem) => {
    if (item.equipped || cosmeticBusy) return;
    if (!item.unlocked && item.unlockMethod === "LEVEL") {
      setProfileMessage(`Reach level ${item.requiredLevel} to unlock ${item.name}.`);
      return;
    }
    if (!item.unlocked && item.unlockMethod === "SPARKS") {
      if ((sparksSummary?.balance ?? 0) < item.sparksPrice) {
        setProfileMessage(
          `You need ${item.sparksPrice.toLocaleString()} Sparks to unlock ${item.name}.`,
        );
        return;
      }
      if (
        !window.confirm(
          `Unlock ${item.name} for ${item.sparksPrice.toLocaleString()} Sparks? Sparks have no cash value.`,
        )
      ) {
        return;
      }
    }
    setCosmeticBusy(item.id);
    setProfileMessage("");
    try {
      if (!item.unlocked) {
        await api("/sparks/purchases", {
          method: "POST",
          body: JSON.stringify({ itemId: item.id }),
        });
      }
      await api("/profile/cosmetics/equipped", {
        method: "PUT",
        body: JSON.stringify({ itemId: item.id }),
      });
      await Promise.all([refetchCosmetics(), refetchSparks()]);
      setProfileMessage(`${item.name} equipped.`);
    } catch (error) {
      setProfileMessage((error as Error).message);
    } finally {
      setCosmeticBusy(undefined);
    }
  };

  return (
    <div
      className="dashboard-page profile-experience"
      style={
        {
          "--profile-theme-primary": equippedTheme?.preview.primary ?? "#0d1926",
          "--profile-theme-accent": equippedTheme?.preview.accent ?? "#68e34b",
        } as React.CSSProperties
      }
    >
      <div className="profile-top-grid">
        <Card
          className={`profile-identity-card profile-pattern--${equippedBanner?.preview.pattern ?? "grid"}`}
          style={
            {
              "--profile-primary": equippedBanner?.preview.primary ?? "#10251d",
              "--profile-accent": equippedBanner?.preview.accent ?? "#68e34b",
            } as React.CSSProperties
          }
        >
          <div className="profile-identity-card__actions">
            <button className="button button--secondary button--small" onClick={openProfileEditor}>
              <Settings /> Edit profile
            </button>
            <button
              className="button button--ghost button--small"
              aria-label="Share profile"
              onClick={() => void shareProfile()}
            >
              <Link2 />
            </button>
          </div>
          <div className="profile-identity-card__main">
            <span
              className="profile-avatar profile-avatar--cosmetic"
              style={
                {
                  "--avatar-primary": equippedAvatar?.preview.primary ?? "#3b2868",
                  "--avatar-accent": equippedAvatar?.preview.accent ?? "#b99cff",
                } as React.CSSProperties
              }
            >
              {equippedAvatar ? (
                <CosmeticGlyph item={equippedAvatar} />
              ) : (
                (currentUser?.username.slice(0, 2).toUpperCase() ?? "—")
              )}
            </span>
            <div className="profile-identity-card__copy">
              <h1>
                {currentUser?.displayName ?? currentUser?.username ?? "Loading profile…"}
                <ShieldCheck aria-label="Nortix account" />
              </h1>
              <p>@{currentUser?.username ?? "loading"}</p>
              <div className="chip-row">
                <Badge tone="purple">
                  {equippedTitle?.name ?? currentUser?.reputationTier ?? "Tester"}
                </Badge>
                <Badge tone="success">Level {currentUser?.testerLevel ?? 0}</Badge>
                {equippedBadge ? <Badge>{equippedBadge.name}</Badge> : null}
              </div>
              <p className="profile-bio">
                {currentUser?.publicProfile?.bio ||
                  "Add a short intro so other testers know what you enjoy playing."}
              </p>
            </div>
          </div>
          <div className="profile-stats profile-stats--integrated">
            <span>
              <strong>{profileActivity?.stats.verifiedPlaytests ?? approvedMilestones}</strong>
              <small>Verified playtests</small>
            </span>
            <span>
              <strong>
                {profileActivity?.stats.participationRecords ?? participations.length}
              </strong>
              <small>Participation records</small>
            </span>
            <span>
              <strong>
                {profileActivity?.stats.premiumIdentities ?? identityData.premium.length}
              </strong>
              <small>Premium identities</small>
            </span>
            <span>
              <strong>
                {profileActivity?.stats.serverScopedIdentities ?? identityData.cracked.length}
              </strong>
              <small>Server-scoped identities</small>
            </span>
          </div>
        </Card>

        <Card className="profile-level-card">
          <div className="profile-level-card__heading">
            <span>
              <small>TESTER PROGRESSION</small>
              <strong>Level {testerLevel}</strong>
            </span>
            <b>{testerExperience.toLocaleString()} total XP</b>
          </div>
          <div className="profile-level-card__xp-label">
            <span>
              <Zap />
              XP progress to Level {testerLevel + 1}
            </span>
            <strong>
              {levelXpEarned.toLocaleString()} / {levelXpRequired.toLocaleString()} XP
            </strong>
          </div>
          <div
            className="profile-level-card__meter"
            role="progressbar"
            aria-label={`Experience progress to level ${testerLevel + 1}`}
            aria-valuemin={0}
            aria-valuemax={levelXpRequired}
            aria-valuenow={Math.min(levelXpEarned, levelXpRequired)}
          >
            <span style={{ width: `${levelXpPercent}%` }} />
            <b>{Math.round(levelXpPercent)}%</b>
          </div>
          <div className="profile-level-card__meter-scale">
            <span>Level {testerLevel}</span>
            <span>{Math.max(0, levelXpRequired - levelXpEarned).toLocaleString()} XP to go</span>
            <span>Level {testerLevel + 1}</span>
          </div>
          <p>
            {cosmetics?.nextLevelUnlock
              ? `${cosmetics.nextLevelUnlock.name} unlocks at level ${cosmetics.nextLevelUnlock.level}.`
              : "All currently published level cosmetics are available to you."}
          </p>
          <div className="profile-level-track" aria-label="Cosmetic level unlocks">
            {levelUnlocks.map((item) => (
              <span
                key={item.id}
                className={
                  (currentUser?.testerLevel ?? 0) >= item.requiredLevel! ? "is-reached" : ""
                }
                title={`${item.name} · level ${item.requiredLevel}`}
              >
                <i>
                  <CosmeticGlyph item={item} />
                </i>
                <small>Level {item.requiredLevel}</small>
              </span>
            ))}
          </div>
          <div className="profile-level-card__next">
            <Sparkles />
            <span>
              <strong>{(sparksSummary?.balance ?? 0).toLocaleString()} Sparks</strong>
              <small>Optional, non-withdrawable points for cosmetic unlocks</small>
            </span>
            <Link to="/dashboard/sparks-shop">Open shop</Link>
          </div>
        </Card>
      </div>

      {profileMessage ? (
        <p className="profile-message profile-message--standalone" role="status">
          {profileMessage}
        </p>
      ) : null}

      <div className="profile-content-grid">
        <Card className="profile-activity-panel">
          <div className="profile-panel-heading">
            <span>
              <small>OVERVIEW</small>
              <h2>Recent activity</h2>
            </span>
            <History />
          </div>
          <div className="profile-activity-list">
            {profileActivity?.activities.length ? (
              profileActivity.activities.map((activity) => (
                <div className="profile-activity-row" key={activity.id}>
                  <i className={`profile-activity-row__icon is-${activity.kind.toLowerCase()}`}>
                    {activity.kind === "FEEDBACK" ? (
                      <MessageSquareText />
                    ) : activity.kind === "JOINED" ? (
                      <UserPlus />
                    ) : activity.kind === "SPARKS" ? (
                      <Sparkles />
                    ) : (
                      <CheckCircle2 />
                    )}
                  </i>
                  <span>
                    <strong>{activity.title}</strong>
                    <small>
                      {activity.detail} · {relativeActivityTime(activity.occurredAt)}
                    </small>
                  </span>
                  {activity.sparks ? <b>+{activity.sparks} Sparks</b> : null}
                </div>
              ))
            ) : (
              <div className="profile-activity-empty">
                <Gamepad2 />
                <strong>Your activity will appear here</strong>
                <small>Join a campaign or complete a verified milestone to get started.</small>
              </div>
            )}
          </div>
          <div className="profile-activity-summary">
            <span>
              <small>Reputation</small>
              <strong>{currentUser?.reputationScore ?? 0}</strong>
            </span>
            <span>
              <small>Playtests</small>
              <strong>{profileActivity?.stats.verifiedPlaytests ?? 0}</strong>
            </span>
            <span>
              <small>Feedback</small>
              <strong>{profileActivity?.stats.feedbackGiven ?? 0}</strong>
            </span>
          </div>
        </Card>

        <Card className="profile-cosmetics-panel">
          <div className="profile-panel-heading">
            <span>
              <small>COLLECTION</small>
              <h2>Cosmetics</h2>
            </span>
            <b>
              {cosmetics?.items.filter((item) => item.unlocked).length ?? 0}/
              {cosmetics?.items.length ?? 0} unlocked
            </b>
          </div>
          <div className="profile-cosmetic-tabs" role="tablist" aria-label="Cosmetic categories">
            {cosmeticTypes.map((category) => (
              <button
                key={category.type}
                role="tab"
                aria-selected={cosmeticType === category.type}
                className={cosmeticType === category.type ? "is-active" : ""}
                onClick={() => setCosmeticType(category.type)}
              >
                {category.label}
              </button>
            ))}
          </div>
          <div className="profile-cosmetic-grid">
            {cosmeticItems.map((item) => (
              <button
                className={`profile-cosmetic-item ${item.equipped ? "is-equipped" : ""} ${
                  !item.unlocked ? "is-locked" : ""
                }`}
                key={item.id}
                disabled={cosmeticBusy === item.id}
                onClick={() => void selectCosmetic(item)}
                style={
                  {
                    "--cosmetic-primary": item.preview.primary,
                    "--cosmetic-accent": item.preview.accent,
                  } as React.CSSProperties
                }
                aria-label={`${item.name}. ${
                  item.equipped
                    ? "Equipped"
                    : item.unlocked
                      ? "Unlocked; equip"
                      : item.unlockMethod === "LEVEL"
                        ? `Unlocks at level ${item.requiredLevel}`
                        : `Costs ${item.sparksPrice} Sparks`
                }`}
              >
                <i>
                  <CosmeticGlyph item={item} />
                  {!item.unlocked ? <Lock className="profile-cosmetic-item__lock" /> : null}
                  {item.equipped ? <Check className="profile-cosmetic-item__check" /> : null}
                </i>
                <strong>{item.name}</strong>
                <small>
                  {item.equipped
                    ? "Equipped"
                    : item.unlockMethod === "LEVEL"
                      ? `Level ${item.requiredLevel}`
                      : item.unlockMethod === "SPARKS" && !item.purchased
                        ? `${item.sparksPrice.toLocaleString()} Sparks`
                        : item.rarity.toLowerCase()}
                </small>
              </button>
            ))}
          </div>
          <p className="profile-cosmetics-note">
            Level rewards unlock automatically. Sparks purchases are permanent and cosmetic only.
          </p>
        </Card>
      </div>

      <Card className="profile-gameplay-stats">
        <div className="profile-panel-heading">
          <span>
            <small>YOUR LAST 30 DAYS</small>
            <h2>Your Minecraft story</h2>
          </span>
          <Gamepad2 />
        </div>
        <p className="profile-gameplay-stats__intro">
          A lighthearted look at your adventures on connected Nortix-verified servers.
        </p>
        <div className="profile-fun-stat-grid">
          <span><Clock3 /><strong>{Math.round((gameplay?.totals.playMinutes ?? 0) / 60)}h</strong><small>Time adventuring</small></span>
          <span><ServerCog /><strong>{gameplay?.totals.serverVisits ?? 0}</strong><small>Server visits</small></span>
          <span><Globe2 /><strong>{gameplay?.totals.serversExplored ?? 0}</strong><small>Worlds explored</small></span>
          <span><Mountain /><strong>{(gameplay?.totals.blocksBroken ?? 0).toLocaleString()}</strong><small>Blocks broken</small></span>
          <span><Target /><strong>{gameplay?.totals.mobsDefeated ?? 0}</strong><small>Mobs defeated</small></span>
          <span><Zap /><strong>{gameplay?.totals.playerWins ?? 0}</strong><small>Player wins</small></span>
        </div>
        <div className="profile-gameplay-charts">
          <section>
            <header>
              <div><small>PLAY RHYTHM</small><h3>This week</h3></div>
              <span>{gameplay?.favoriteServer ? `Favorite lately: ${gameplay.favoriteServer}` : "Your next favorite is waiting"}</span>
            </header>
            <div className="profile-play-chart" aria-label="Minutes played during the last seven days">
              {gameplay?.daily.map((day) => (
                <span key={day.date}>
                  <i style={{ height: `${Math.max(day.playMinutes > 0 ? 8 : 2, (day.playMinutes / maxDailyPlayMinutes) * 100)}%` }} title={`${day.playMinutes} minutes`} />
                  <b>{day.playMinutes ? `${day.playMinutes}m` : "—"}</b>
                  <small>{day.label}</small>
                </span>
              ))}
            </div>
          </section>
          <section>
            <header><div><small>ADVENTURE MIX</small><h3>What kept you busy</h3></div></header>
            <div className="profile-action-chart">
              {actionMix.map(({ label, value, icon: Icon }) => (
                <span key={label}>
                  <i><Icon /></i>
                  <strong>{label}</strong>
                  <em><b style={{ width: `${(value / maxActionValue) * 100}%` }} /></em>
                  <small>{value.toLocaleString()}</small>
                </span>
              ))}
            </div>
          </section>
        </div>
        <p className="profile-gameplay-note">
          These private stats update as you play with a linked Minecraft identity on eligible servers.
        </p>
      </Card>

      {profileEditOpen ? (
        <Modal
          title="Edit profile"
          className="modal--compact"
          onClose={() => setProfileEditOpen(false)}
        >
          <form onSubmit={saveProfile}>
            <div className="modal__body profile-edit-form">
              <p>These details can appear on your shared public profile.</p>
              <label>
                Username
                <input
                  required
                  minLength={3}
                  maxLength={16}
                  pattern="[A-Za-z0-9_]{3,16}"
                  value={profileDraft.username}
                  onChange={(event) =>
                    setProfileDraft({ ...profileDraft, username: event.target.value })
                  }
                />
              </label>
              <label>
                Display name
                <input
                  required
                  maxLength={80}
                  value={profileDraft.displayName}
                  onChange={(event) =>
                    setProfileDraft({ ...profileDraft, displayName: event.target.value })
                  }
                />
              </label>
              <label>
                Bio
                <textarea
                  rows={3}
                  maxLength={240}
                  placeholder="A short intro about your Minecraft interests"
                  value={profileDraft.bio}
                  onChange={(event) =>
                    setProfileDraft({ ...profileDraft, bio: event.target.value })
                  }
                />
              </label>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={profileDraft.isPublic}
                  onChange={(event) =>
                    setProfileDraft({ ...profileDraft, isPublic: event.target.checked })
                  }
                />
                Show my profile when someone opens my link
              </label>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={profileDraft.showReputation}
                  onChange={(event) =>
                    setProfileDraft({ ...profileDraft, showReputation: event.target.checked })
                  }
                />
                Show my reputation and tester level
              </label>
              <div className="profile-owner-mode">
                <span className="profile-owner-mode__icon">
                  <ServerCog />
                </span>
                <span>
                  <strong>{t("profile.serverOwnerMode")}</strong>
                  <small>{t("profile.serverOwnerModeDescription")}</small>
                </span>
                <button
                  type="button"
                  className={`owner-toggle ${serverOwnerMode ? "is-on" : ""}`}
                  role="switch"
                  aria-checked={serverOwnerMode}
                  aria-label={t("profile.serverOwnerMode")}
                  onClick={toggleServerOwnerMode}
                >
                  <span />
                </button>
              </div>
            </div>
            <div className="modal__footer">
              <button
                className="button button--ghost"
                type="button"
                onClick={() => setProfileEditOpen(false)}
              >
                Cancel
              </button>
              <Button type="submit" disabled={profileBusy}>
                {profileBusy ? "Saving…" : "Save profile"}
              </Button>
            </div>
          </form>
        </Modal>
      ) : null}
      <section className="identity-center">
        <div className="identity-center__heading">
          <div>
            <span className="eyebrow">MINECRAFT IDENTITY</span>
            <h2>Account linking</h2>
            <p>
              Premium accounts are verified once on Nortix. Cracked names are private, temporary,
              and scoped to one server.
            </p>
          </div>
          <button className="button button--secondary" onClick={() => refreshIdentities()}>
            <History /> Refresh status
          </button>
        </div>
        {identityMessage && (
          <div className="identity-notice" role="status">
            {identityMessage}
          </div>
        )}
        <div className="identity-link-grid">
          <Card className="identity-link-card">
            <div className="identity-link-card__title">
              <ShieldCheck />
              <div>
                <h3>Premium Java account</h3>
                <p>
                  Verified through Nortix’s online-mode server. No OAuth or account password is
                  requested.
                </p>
              </div>
            </div>
            {identityData.premium.map((identity) => (
              <div className="identity-record" key={identity.id}>
                <span>
                  <strong>{identity.username}</strong>
                  <small>{identity.uuid}</small>
                </span>
                <Badge>Verified once</Badge>
                <button
                  aria-label={`Unlink ${identity.username}`}
                  onClick={() => unlink("premium", identity.id)}
                >
                  <Unlink2 />
                </button>
              </div>
            ))}
            {identityData.premium.length === 0 && (
              <p className="identity-empty">No premium Minecraft account is linked yet.</p>
            )}
            {claim ? (
              <div className="identity-claim-ready">
                <span>
                  <strong>Claim code ready</strong>
                  <small>
                    Expires{" "}
                    {new Date(claim.expiresAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </small>
                </span>
                <button
                  className="button button--secondary button--small"
                  onClick={() => setClaimOpen(true)}
                >
                  View instructions
                </button>
              </div>
            ) : (
              <button
                className="button button--primary"
                disabled={identityBusy}
                onClick={createPremiumClaim}
              >
                <Link2 /> Verify a premium account
              </button>
            )}
          </Card>
          <Card className="identity-link-card">
            <div className="identity-link-card__title">
              <Gamepad2 />
              <div>
                <h3>Cracked server account</h3>
                <p>
                  Reserve the exact name before its first-ever join. This does not appear on your
                  public profile.
                </p>
              </div>
            </div>
            <label className="identity-field">
              <span>Server</span>
              <select value={serverId} onChange={(event) => setServerId(event.target.value)}>
                <option value="">Choose a supported server</option>
                {serverOptions.map((server) => (
                  <option
                    value={server.id}
                    key={server.id}
                    disabled={!server.crackedAccountLinkingAvailable}
                  >
                    {server.name}
                    {server.crackedAccountLinkingAvailable ? "" : " · linking unavailable"}
                  </option>
                ))}
              </select>
            </label>
            <label className="identity-field">
              <span>Exact Minecraft name</span>
              <input
                value={crackedName}
                maxLength={16}
                placeholder="nortix123"
                onChange={(event) => setCrackedName(event.target.value)}
              />
            </label>
            <button
              className="button button--primary"
              disabled={identityBusy || !serverId || !/^[A-Za-z0-9_]{3,16}$/.test(crackedName)}
              onClick={reserveCracked}
            >
              <Clock3 /> Reserve for 30 minutes
            </button>
            <small className="identity-rules">
              Up to 3 reservations per hour and 5 per rolling day. Unused reservations expire
              automatically.
            </small>
          </Card>
        </div>
        {identityData.cracked.length > 0 && (
          <Card className="identity-active-card">
            <h3>Server-scoped links</h3>
            {identityData.cracked.map((link) => (
              <div className="identity-record" key={link.id}>
                <span>
                  <strong>{link.minecraftUsername}</strong>
                  <small>
                    {link.server.name} ·{" "}
                    {link.status === "PENDING" ? "Waiting for first join" : "First join confirmed"}
                  </small>
                </span>
                <Badge tone={link.status === "ACTIVE" ? "success" : "purple"}>{link.status}</Badge>
                <button
                  aria-label={`Release ${link.minecraftUsername}`}
                  onClick={() => unlink("cracked", link.id, link.status === "ACTIVE")}
                >
                  <Unlink2 />
                </button>
              </div>
            ))}
          </Card>
        )}
        <Card className="identity-activity-card">
          <h3>Private identity activity</h3>
          <p>Only you and authorized Nortix safety staff can see this history.</p>
          <div className="identity-timeline">
            {identityData.activity.length === 0 && (
              <span className="identity-empty">No identity activity yet.</span>
            )}
            {identityData.activity.map((event) => (
              <div key={event.id}>
                <i />
                <span>
                  <strong>{event.type.replaceAll("_", " ").toLowerCase()}</strong>
                  <small>
                    {event.minecraftUsername || "Minecraft account"}
                    {event.server ? ` · ${event.server.name}` : ""} ·{" "}
                    {new Date(event.createdAt).toLocaleString()}
                  </small>
                </span>
              </div>
            ))}
          </div>
        </Card>
      </section>
      {claim && claimOpen ? (
        <Modal
          title="Link your premium Minecraft account"
          className="modal--compact premium-claim-modal"
          onClose={() => setClaimOpen(false)}
        >
          <div className="modal__body">
            <div className="identity-claim-code premium-claim-modal__code">
              <small>
                Join <strong>{claim.verificationServer}</strong>, then run
              </small>
              <code>/nortixclaim {claim.code}</code>
              <button
                className="button button--ghost button--small"
                onClick={() => void navigator.clipboard.writeText(`/nortixclaim ${claim.code}`)}
              >
                <Copy /> Copy command
              </button>
              <span>
                Expires{" "}
                {new Date(claim.expiresAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <div className="premium-link-steps">
              <div>
                <b>1</b>
                <span>
                  <strong>Join the verification server</strong>
                  <small>Open Minecraft Java Edition and connect to the server shown above.</small>
                </span>
              </div>
              <div>
                <b>2</b>
                <span>
                  <strong>Run the command</strong>
                  <small>
                    Paste the command into Minecraft chat and send it. Never share your one-time
                    code.
                  </small>
                </span>
              </div>
              <div>
                <b>3</b>
                <span>
                  <strong>Come back to Nortix</strong>
                  <small>
                    We will verify the account automatically. This claim expires soon, so finish
                    before the time shown above.
                  </small>
                </span>
              </div>
            </div>
          </div>
          <div className="modal__footer">
            <Button type="button" onClick={() => setClaimOpen(false)}>
              Done
            </Button>
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
