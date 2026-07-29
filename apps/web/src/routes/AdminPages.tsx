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
  Plus,
  RotateCcw,
  Radio,
  Save,
  Search,
  Send,
  Server,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Store,
  Truck,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { NavLink } from "react-router-dom";
import { Button, Card } from "@nortix/ui";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Modal } from "../components/Modal";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import {
  artIndexFor,
  type AdminCampaignServer,
  type AdminOngoingCampaign,
  type AdminReviewCampaign,
  type AdminSponsoredPurchase,
  type AdminSponsoredStore,
  useAdminCampaignServers,
  useAdminOngoingCampaigns,
  useAdminOverview,
  useAdminSponsoredPurchases,
  useAdminSponsoredStores,
  useAdminMessages,
  useAdminReviewCampaigns,
  useAuditLogs,
  useCurrentUser,
} from "../features/api-data";
import { api } from "../lib/api";

const sections = [
  ["Overview", "/admin", Gauge],
  ["Users & access", "/admin/users", Users],
  ["Servers", "/admin/servers", Server],
  ["Campaign moderation", "/admin/campaigns", ClipboardCheck],
  ["Reports & cases", "/admin/reports", ShieldAlert],
  ["Admin messages", "/admin/messages", MessageSquare],
  ["Sponsored Sparks catalog", "/admin/sponsored-shop", Store],
  ["Sponsored purchases", "/admin/sponsored-purchases", Truck],
  ["Nortix staff access", "/admin/access", KeyRound],
  ["Live activity monitor", "/admin/monitor", Radio],
  ["Product analytics", "/admin/analytics", BarChart3],
  ["Umami usage", "/admin/umami", Activity],
  ["Activity logs", "/admin/audit-logs", Eye],
  ["Termination tools", "/admin/termination", Trash2],
  ["System settings", "/admin/settings", Settings],
] as const;

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sectionSearch, setSectionSearch] = useState("");
  const { data: currentUser, isLoading: accessLoading, isError: accessError } = useCurrentUser();
  const visibleSections = sections.filter(
    ([label, href]) =>
      label.toLowerCase().includes(sectionSearch.toLowerCase()) &&
      (!["/admin/messages", "/admin/sponsored-shop", "/admin/sponsored-purchases"].includes(href) ||
        currentUser?.roles.includes("ADMIN")),
  );
  const hasAdminAccess = currentUser?.roles.some(
    (role) => role === "ADMIN" || role === "MODERATOR",
  );
  const staffRole = currentUser?.roles.includes("ADMIN") ? "NORTIX ADMIN" : "NORTIX MODERATOR";

  if (accessLoading) {
    return (
      <div className="admin-access-state">
        <ShieldCheck />
        <h1>Checking administrator access…</h1>
      </div>
    );
  }
  if (accessError || !hasAdminAccess) {
    return (
      <div className="admin-access-state">
        <LockKeyhole />
        <h1>Administrator access required</h1>
        <p>This internal workspace is available only to authorized Nortix staff.</p>
        <NavLink className="button button--primary" to="/dashboard">
          Return to Nortix
        </NavLink>
      </div>
    );
  }

  return (
    <div className="admin-page admin-v2">
      <div className="admin-banner">
        <ShieldCheck />
        <div>
          <strong>Nortix administration</strong>
          <small>Full actions are permission-gated, confirmed, and written to the audit log.</small>
        </div>
        <LanguageSwitcher compact />
        <span className="admin-role">{staffRole}</span>
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

export function AdminOverviewPage() {
  const [messageOpen, setMessageOpen] = useState(false);
  const { data: overview, isLoading, isError, refetch } = useAdminOverview();
  const { data: auditLogs } = useAuditLogs();
  const { data: currentUser } = useCurrentUser();
  const overviewEvents = (auditLogs ?? [])
    .slice(0, 8)
    .map((entry) => [
      entry.actor?.displayName ?? entry.actor?.username ?? "System",
      entry.action,
      `${entry.entityType}:${entry.entityId}`,
      new Date(entry.createdAt).toLocaleString(),
    ]);

  return (
    <>
      <AdminHeading
        title="Operations overview"
        description="Moderation, access, platform usage, live signals, Sparks policy, and system controls."
        action={
          currentUser?.roles.includes("ADMIN") ? (
            <Button onClick={() => setMessageOpen(true)}>
              <Send /> Message users
            </Button>
          ) : undefined
        }
      />
      {isLoading ? (
        <Card>
          <p>Loading seeded operations data…</p>
        </Card>
      ) : null}
      {isError ? (
        <Card>
          <p>Seeded operations data could not be loaded.</p>
          <Button onClick={() => refetch()}>Retry</Button>
        </Card>
      ) : null}
      <div className="admin-kpi-grid">
        {[
          {
            Icon: Users,
            label: "User accounts",
            value: overview?.users ?? "—",
            note: "Database records",
          },
          {
            Icon: Server,
            label: "Servers",
            value: overview?.servers ?? "—",
            note: "All moderation states",
          },
          {
            Icon: ClipboardCheck,
            label: "Campaigns",
            value: overview?.campaigns ?? "—",
            note: "All lifecycle states",
          },
          {
            Icon: ShieldAlert,
            label: "Open moderation",
            value: overview?.openCases ?? "—",
            note: "Cases requiring attention",
          },
          {
            Icon: Sparkles,
            label: "Pending requests",
            value: "—",
            note: "Legacy review queue",
          },
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
              <h2>Platform data monitor</h2>
              <p>
                Counts below come from the seeded database through administrator-only endpoints.
              </p>
            </div>
            <span className="live-pill">DATABASE</span>
          </div>
          <div className="admin-signal-grid">
            {[
              ["Users", "Available", String(overview?.users ?? "—")],
              ["Servers", "Available", String(overview?.servers ?? "—")],
              ["Campaigns", "Available", String(overview?.campaigns ?? "—")],
              ["Moderation queue", "Available", String(overview?.openCases ?? "—")],
            ].map(([label, status, value]) => (
              <div key={label}>
                <i className="signal-good" />
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
          <p>
            Controls remain unavailable until a persisted, audited system-settings endpoint is
            configured.
          </p>
          <label className="admin-toggle-row">
            <span>
              <strong>Maintenance mode</strong>
              <small>Limit new sessions while preserving admin access.</small>
            </span>
            <input type="checkbox" disabled />
          </label>
          <label className="admin-toggle-row">
            <span>
              <strong>Campaign joins</strong>
              <small>Allow players to begin new campaign activity.</small>
            </span>
            <input type="checkbox" disabled />
          </label>
          <label className="admin-toggle-row">
            <span>
              <strong>Sparks issuance</strong>
              <small>Could pause all automated Sparks issuance.</small>
            </span>
            <input type="checkbox" disabled />
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

const toLocalDateTimeInput = (date: Date) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
};

const createSponsoredCampaignDraft = () => {
  const endsAt = new Date(Date.now() + 7 * 24 * 60 * 60_000);
  return {
    serverId: "",
    title: "",
    description:
      "Help this Minecraft server evaluate a focused player experience and provide useful feedback.",
    category: "Playtest",
    endsAt: toLocalDateTimeInput(endsAt),
    budgetCredits: "5000",
    minimumSparksReward: "50",
    maximumSparksReward: "100",
    versions: "",
    milestoneTitle: "Share structured feedback",
    milestoneInstructions:
      "Complete the playtest and submit specific feedback about your experience.",
  };
};

export function CampaignReviewPage() {
  const { data: currentUser } = useCurrentUser();
  const isAdmin = currentUser?.roles.includes("ADMIN") === true;
  const { data, isLoading, isError, refetch } = useAdminReviewCampaigns();
  const { data: campaignServers = [] } = useAdminCampaignServers(isAdmin);
  const {
    data: ongoingCampaigns = [],
    isLoading: ongoingLoading,
    refetch: refetchOngoing,
  } = useAdminOngoingCampaigns(isAdmin);
  const campaigns = data ?? [];
  const [selected, setSelected] = useState<AdminReviewCampaign | null>(null);
  const [reason, setReason] = useState("");
  const [reviewMessage, setReviewMessage] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const [createMessage, setCreateMessage] = useState("");
  const [campaignDraft, setCampaignDraft] = useState(createSponsoredCampaignDraft);
  const [terminating, setTerminating] = useState<AdminOngoingCampaign | null>(null);
  const [terminationReason, setTerminationReason] = useState("");
  const [refundPolicy, setRefundPolicy] = useState<"REFUND_ALL" | "REFUND_UNUSED" | "NO_REFUND">(
    "REFUND_UNUSED",
  );
  const [terminationConfirmation, setTerminationConfirmation] = useState("");
  const [terminationBusy, setTerminationBusy] = useState(false);
  const [terminationMessage, setTerminationMessage] = useState("");

  const review = async (action: "APPROVE" | "REJECT" | "PAUSE") => {
    if (!selected) return;
    if (action !== "APPROVE" && reason.trim().length < 3) {
      setReviewMessage("Add an internal reason before a restrictive action.");
      return;
    }
    try {
      await api(`/admin/campaigns/${selected.id}/review`, {
        method: "POST",
        body: JSON.stringify({ action, note: reason.trim() || undefined }),
      });
      setSelected(null);
      setReason("");
      setReviewMessage("");
      await refetch();
    } catch (error) {
      setReviewMessage(error instanceof Error ? error.message : "The review action failed.");
    }
  };

  const openSponsoredCampaign = () => {
    const draft = createSponsoredCampaignDraft();
    const firstServer = campaignServers[0];
    setCampaignDraft({
      ...draft,
      serverId: firstServer?.id ?? "",
      versions: firstServer?.versions.join(", ") ?? "",
      category: firstServer?.categories[0] ?? draft.category,
    });
    setCreateMessage("");
    setCreateOpen(true);
  };

  const createSponsoredCampaign = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateBusy(true);
    setCreateMessage("");
    try {
      await api("/admin/campaigns/sponsored", {
        method: "POST",
        body: JSON.stringify({
          serverId: campaignDraft.serverId,
          title: campaignDraft.title,
          description: campaignDraft.description,
          category: campaignDraft.category,
          startsAt: new Date().toISOString(),
          endsAt: new Date(campaignDraft.endsAt).toISOString(),
          budgetCredits: Number(campaignDraft.budgetCredits),
          sparksRewardRange: {
            minimum: Number(campaignDraft.minimumSparksReward),
            maximum: Number(campaignDraft.maximumSparksReward),
          },
          regionRestrictions: [],
          versionRequirements: campaignDraft.versions
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean),
          quickStartConfig: {},
          milestones: [
            {
              templateType: "SUBMIT_FEEDBACK",
              title: campaignDraft.milestoneTitle,
              instructions: campaignDraft.milestoneInstructions,
              verificationMethod: "WEB_EVENT",
              config: { source: "NORTIX_ADMIN" },
            },
          ],
        }),
      });
      setCreateOpen(false);
      setCreateMessage("Nortix-sponsored campaign created without using owner Campaign Credits.");
      await refetchOngoing();
    } catch (error) {
      setCreateMessage(
        error instanceof Error ? error.message : "The sponsored campaign could not be created.",
      );
    } finally {
      setCreateBusy(false);
    }
  };

  const openTermination = (campaign: AdminOngoingCampaign) => {
    setTerminating(campaign);
    setRefundPolicy(campaign.fundingSource === "NORTIX_SPONSORED" ? "NO_REFUND" : "REFUND_UNUSED");
    setTerminationReason("");
    setTerminationConfirmation("");
    setTerminationMessage("");
  };

  const terminateCampaign = async () => {
    if (!terminating) return;
    setTerminationBusy(true);
    setTerminationMessage("");
    try {
      await api(`/admin/campaigns/${terminating.id}/terminate`, {
        method: "POST",
        body: JSON.stringify({
          refundPolicy,
          reason: terminationReason.trim() || undefined,
          confirmation: terminationConfirmation,
        }),
      });
      setTerminating(null);
      await refetchOngoing();
    } catch (error) {
      setTerminationMessage(
        error instanceof Error ? error.message : "The campaign could not be terminated.",
      );
    } finally {
      setTerminationBusy(false);
    }
  };

  return (
    <>
      <AdminHeading
        title="Campaign moderation"
        description="Review task clarity, Sparks limits, verification, safety, and owner history."
        action={
          isAdmin ? (
            <Button onClick={openSponsoredCampaign}>
              <Plus /> Create sponsored campaign
            </Button>
          ) : undefined
        }
      />
      {createMessage && !createOpen ? <p role="status">{createMessage}</p> : null}
      {isLoading ? (
        <Card>
          <p>Loading seeded moderation queue…</p>
        </Card>
      ) : null}
      {isError ? (
        <Card>
          <p>The seeded moderation queue could not be loaded.</p>
          <Button onClick={() => refetch()}>Retry</Button>
        </Card>
      ) : null}
      {!isLoading && !isError && campaigns.length === 0 ? (
        <Card>
          <p>No seeded campaigns currently require review.</p>
        </Card>
      ) : null}
      <div className="admin-queue">
        {campaigns.slice(0, 5).map((campaign) => (
          <Card className="review-queue-card" key={campaign.id}>
            <div className="review-queue-card__header">
              <span
                className={`server-inline__logo server-art--${artIndexFor(campaign.server.id)}`}
              >
                {campaign.server.name.slice(0, 2)}
              </span>
              <div>
                <h2>{campaign.title}</h2>
                <p>
                  {campaign.server.name} · submitted {new Date(campaign.createdAt).toLocaleString()}
                </p>
              </div>
              <span className="admin-status">{campaign.status}</span>
            </div>
            <div className="review-card-stats">
              <span>
                <small>Potential Sparks</small>
                <strong>
                  {campaign.minimumSparksReward}–{campaign.maximumSparksReward}
                </strong>
              </span>
              <span>
                <small>Verification</small>
                <strong>
                  {campaign.automaticVerification ? "Automatic checks" : "System review"}
                </strong>
              </span>
              <span>
                <small>Capacity</small>
                <strong>{campaign.maxParticipants}</strong>
              </span>
              <span>
                <small>Risk score</small>
                <strong>Pending assessment</strong>
              </span>
              <span>
                <small>Owner status</small>
                <strong>{campaign.owner.status}</strong>
              </span>
            </div>
            <div className="review-queue-card__footer">
              <span>
                {campaign.milestones.length} tasks · submitted{" "}
                {new Date(campaign.createdAt).toLocaleDateString()}
              </span>
              <Button variant="secondary" onClick={() => setSelected(campaign)}>
                Open review
              </Button>
            </div>
          </Card>
        ))}
      </div>
      {isAdmin ? (
        <section className="admin-campaign-operations">
          <div className="data-card__header">
            <div>
              <h2>Ongoing campaigns</h2>
              <p>
                Termination stops new joins and milestone approvals. Refund choices affect Campaign
                Credits only; already verified player Sparks are not reversed.
              </p>
            </div>
          </div>
          {ongoingLoading ? (
            <Card>
              <p>Loading ongoing campaigns…</p>
            </Card>
          ) : null}
          {!ongoingLoading && ongoingCampaigns.length === 0 ? (
            <Card>
              <p>No campaigns are currently eligible for termination.</p>
            </Card>
          ) : null}
          <div className="admin-queue">
            {ongoingCampaigns.map((campaign) => (
              <Card className="review-queue-card" key={campaign.id}>
                <div className="review-queue-card__header">
                  <span
                    className={`server-inline__logo server-art--${artIndexFor(campaign.server.id)}`}
                  >
                    {campaign.server.name.slice(0, 2)}
                  </span>
                  <div>
                    <h2>{campaign.title}</h2>
                    <p>
                      {campaign.server.name} · @{campaign.server.owner.username}
                    </p>
                  </div>
                  <span className="admin-status">{campaign.status}</span>
                </div>
                <div className="review-card-stats">
                  <span>
                    <small>Funding</small>
                    <strong>
                      {campaign.fundingSource === "NORTIX_SPONSORED"
                        ? "Nortix sponsored"
                        : "Owner credits"}
                    </strong>
                  </span>
                  <span>
                    <small>Allocated credits</small>
                    <strong>{campaign.campaignBudgetCredits.toLocaleString()}</strong>
                  </span>
                  <span>
                    <small>Consumed credits</small>
                    <strong>{campaign.consumedBudgetCredits.toLocaleString()}</strong>
                  </span>
                  <span>
                    <small>Participants</small>
                    <strong>{campaign._count.participations.toLocaleString()}</strong>
                  </span>
                  <span>
                    <small>Ends</small>
                    <strong>{new Date(campaign.endsAt).toLocaleDateString()}</strong>
                  </span>
                </div>
                <div className="review-queue-card__footer">
                  <span>
                    Up to {campaign.maximumSparksReward} Sparks · ID {campaign.id}
                  </span>
                  <Button variant="danger" onClick={() => openTermination(campaign)}>
                    <Trash2 /> Terminate
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </section>
      ) : null}
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
                <input value={`Up to ${selected.maximumSparksReward} Sparks`} readOnly />
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
                <input
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Required for restrictive actions"
                />
              </label>
            </div>
            {reviewMessage ? <p role="alert">{reviewMessage}</p> : null}
          </div>
          <div className="modal__footer modal__footer--spread">
            <div>
              <Button variant="danger" onClick={() => review("REJECT")}>
                <X /> Reject
              </Button>
              <Button variant="secondary" onClick={() => review("PAUSE")}>
                <Pause /> Pause
              </Button>
            </div>
            <Button onClick={() => review("APPROVE")}>
              <Check /> Approve changes
            </Button>
          </div>
        </Modal>
      )}
      {createOpen ? (
        <Modal title="Create Nortix-sponsored campaign" onClose={() => setCreateOpen(false)}>
          <form onSubmit={createSponsoredCampaign}>
            <div className="modal__body admin-editor">
              <p className="admin-editor-note">
                This creates a normal player-facing campaign funded by Nortix. The allocation
                controls capacity but never debits the server owner’s Campaign Credits.
              </p>
              <div className="form-grid form-grid--two">
                <label className="span-two">
                  Server
                  <select
                    required
                    value={campaignDraft.serverId}
                    onChange={(event) => {
                      const server = campaignServers.find((item) => item.id === event.target.value);
                      setCampaignDraft({
                        ...campaignDraft,
                        serverId: event.target.value,
                        versions: server?.versions.join(", ") ?? "",
                        category: server?.categories[0] ?? campaignDraft.category,
                      });
                    }}
                  >
                    <option value="">Select an approved, verified server</option>
                    {campaignServers.map((server: AdminCampaignServer) => (
                      <option value={server.id} key={server.id}>
                        {server.name} · @{server.owner.username}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Campaign title
                  <input
                    required
                    minLength={6}
                    maxLength={64}
                    value={campaignDraft.title}
                    onChange={(event) =>
                      setCampaignDraft({ ...campaignDraft, title: event.target.value })
                    }
                  />
                </label>
                <label>
                  Category
                  <input
                    required
                    minLength={2}
                    maxLength={40}
                    value={campaignDraft.category}
                    onChange={(event) =>
                      setCampaignDraft({ ...campaignDraft, category: event.target.value })
                    }
                  />
                </label>
                <label className="span-two">
                  Player-facing description
                  <textarea
                    required
                    minLength={30}
                    maxLength={320}
                    rows={3}
                    value={campaignDraft.description}
                    onChange={(event) =>
                      setCampaignDraft({ ...campaignDraft, description: event.target.value })
                    }
                  />
                </label>
                <label>
                  Ends
                  <input
                    required
                    type="datetime-local"
                    value={campaignDraft.endsAt}
                    onChange={(event) =>
                      setCampaignDraft({ ...campaignDraft, endsAt: event.target.value })
                    }
                  />
                </label>
                <label>
                  Nortix sponsorship allocation
                  <input
                    required
                    type="number"
                    min={100}
                    max={10_000_000}
                    value={campaignDraft.budgetCredits}
                    onChange={(event) =>
                      setCampaignDraft({ ...campaignDraft, budgetCredits: event.target.value })
                    }
                  />
                </label>
                <label>
                  Minecraft versions
                  <input
                    value={campaignDraft.versions}
                    onChange={(event) =>
                      setCampaignDraft({ ...campaignDraft, versions: event.target.value })
                    }
                    placeholder="1.20.4, 1.21"
                  />
                </label>
                <label>
                  Minimum potential Sparks
                  <input
                    required
                    type="number"
                    min={5}
                    max={2000}
                    value={campaignDraft.minimumSparksReward}
                    onChange={(event) =>
                      setCampaignDraft({
                        ...campaignDraft,
                        minimumSparksReward: event.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  Maximum potential Sparks
                  <input
                    required
                    type="number"
                    min={10}
                    max={2000}
                    value={campaignDraft.maximumSparksReward}
                    onChange={(event) =>
                      setCampaignDraft({
                        ...campaignDraft,
                        maximumSparksReward: event.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  Milestone title
                  <input
                    required
                    minLength={3}
                    maxLength={72}
                    value={campaignDraft.milestoneTitle}
                    onChange={(event) =>
                      setCampaignDraft({
                        ...campaignDraft,
                        milestoneTitle: event.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  Milestone instructions
                  <input
                    required
                    minLength={10}
                    maxLength={240}
                    value={campaignDraft.milestoneInstructions}
                    onChange={(event) =>
                      setCampaignDraft({
                        ...campaignDraft,
                        milestoneInstructions: event.target.value,
                      })
                    }
                  />
                </label>
              </div>
              {createMessage ? <p role="alert">{createMessage}</p> : null}
            </div>
            <div className="modal__footer">
              <Button variant="secondary" type="button" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createBusy || campaignServers.length === 0}>
                {createBusy ? "Creating…" : "Create sponsored campaign"}
              </Button>
            </div>
          </form>
        </Modal>
      ) : null}
      {terminating ? (
        <Modal title="Terminate ongoing campaign" onClose={() => setTerminating(null)}>
          <div className="modal__body admin-editor">
            <div className="admin-destructive-summary">
              <strong>{terminating.title}</strong>
              <span>
                {terminating.server.name} · {terminating.status}
              </span>
              <p>
                {terminating.campaignBudgetCredits.toLocaleString()} credits allocated ·{" "}
                {terminating.consumedBudgetCredits.toLocaleString()} consumed
              </p>
            </div>
            <label>
              Campaign Credits refund
              <select
                value={refundPolicy}
                disabled={terminating.fundingSource === "NORTIX_SPONSORED"}
                onChange={(event) =>
                  setRefundPolicy(
                    event.target.value as "REFUND_ALL" | "REFUND_UNUSED" | "NO_REFUND",
                  )
                }
              >
                <option value="REFUND_ALL">Refund all allocated credits</option>
                <option value="REFUND_UNUSED">Refund only unconsumed credits</option>
                <option value="NO_REFUND">No Campaign Credits refund</option>
              </select>
              {terminating.fundingSource === "NORTIX_SPONSORED" ? (
                <small>Nortix-sponsored campaigns never debit or refund owner credits.</small>
              ) : null}
            </label>
            <label>
              Reason (optional)
              <textarea
                rows={3}
                maxLength={2000}
                value={terminationReason}
                onChange={(event) => setTerminationReason(event.target.value)}
                placeholder="Internal moderation or operational context"
              />
            </label>
            <label>
              Type the campaign ID to confirm: <code>{terminating.id}</code>
              <input
                value={terminationConfirmation}
                onChange={(event) => setTerminationConfirmation(event.target.value)}
              />
            </label>
            <p className="admin-editor-note">
              This is final. New joins and new milestone approvals stop immediately. Previously
              verified player Sparks remain in place.
            </p>
            {terminationMessage ? <p role="alert">{terminationMessage}</p> : null}
          </div>
          <div className="modal__footer">
            <Button variant="secondary" onClick={() => setTerminating(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={terminationBusy || terminationConfirmation !== terminating.id}
              onClick={terminateCampaign}
            >
              <Trash2 /> {terminationBusy ? "Terminating…" : "Terminate campaign"}
            </Button>
          </div>
        </Modal>
      ) : null}
    </>
  );
}

export function SparksAdjustmentReviewPage() {
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
                  <td>
                    <strong>{row[0]}</strong>
                  </td>
                  <td>{row[1]}</td>
                  <td>{row[2]}</td>
                  <td>{row[3]}</td>
                  <td>
                    <span className="admin-status">PENDING</span>
                  </td>
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
            <Button variant="danger" onClick={() => setEditing(false)}>
              Reject
            </Button>
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

const optionalFormString = (form: FormData, key: string) => {
  const value = String(form.get(key) ?? "").trim();
  return value || undefined;
};

export function AdminSponsoredShopPage() {
  const { data: stores = [], isLoading, refetch } = useAdminSponsoredStores();
  const [storeOpen, setStoreOpen] = useState(false);
  const [itemStore, setItemStore] = useState<AdminSponsoredStore | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");

  const toggleStore = async (store: AdminSponsoredStore) => {
    setBusy(store.id);
    setMessage("");
    try {
      await api(`/admin/sponsored-stores/${store.id}`, {
        method: "PATCH",
        body: JSON.stringify({ available: !store.available }),
      });
      await refetch();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The store could not be updated.");
    } finally {
      setBusy("");
    }
  };

  const toggleItem = async (item: AdminSponsoredStore["items"][number]) => {
    setBusy(item.id);
    setMessage("");
    try {
      await api(`/admin/sponsored-items/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ available: !item.available }),
      });
      await refetch();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The item could not be updated.");
    } finally {
      setBusy("");
    }
  };

  return (
    <>
      <AdminHeading
        title="Nortix-sponsored Sparks catalog"
        description="Create independent gift storefronts and control which items players may request with Sparks."
        action={
          <Button onClick={() => setStoreOpen(true)}>
            <Plus /> Create store
          </Button>
        }
      />
      <Card className="admin-policy-note">
        <ShieldCheck />
        <div>
          <h3>Independent gifts, not partnerships</h3>
          <p>
            Player pages automatically state that Nortix Labs supplies the gifts and is not
            affiliated with, endorsed by, or partnered with the named store or brand.
          </p>
        </div>
      </Card>
      {message ? <p role="status">{message}</p> : null}
      {isLoading ? <Card><p>Loading sponsored catalog…</p></Card> : null}
      <div className="admin-sponsored-store-list">
        {stores.map((store) => (
          <Card key={store.id}>
            <div className="admin-sponsored-store-heading">
              <div>
                <small>{store.slug}</small>
                <h3>{store.name}</h3>
                <p>{store.description}</p>
              </div>
              <span className={store.available ? "status-good" : "status-muted"}>
                {store.available ? "PLAYER VISIBLE" : "HIDDEN"}
              </span>
              <Button
                variant="secondary"
                disabled={busy === store.id}
                onClick={() => void toggleStore(store)}
              >
                {store.available ? "Hide store" : "Publish store"}
              </Button>
              <Button onClick={() => setItemStore(store)}>
                <Plus /> Add item
              </Button>
            </div>
            <div className="admin-sponsored-item-list">
              {store.items.map((item) => (
                <div key={item.id}>
                  <span>
                    <strong>{item.name}</strong>
                    <small>
                      {item.sparksPrice.toLocaleString()} Sparks · {item._count.purchases} purchases
                    </small>
                  </span>
                  <span>{item.fulfillmentSummary}</span>
                  <span>{item.fulfillmentFields.join(", ") || "No player details required"}</span>
                  <button
                    disabled={busy === item.id}
                    onClick={() => void toggleItem(item)}
                  >
                    {item.available ? "Available" : "Hidden"}
                  </button>
                </div>
              ))}
              {store.items.length === 0 ? <p>No items have been created for this store.</p> : null}
            </div>
          </Card>
        ))}
      </div>
      {storeOpen ? (
        <Modal title="Create sponsored store" onClose={() => setStoreOpen(false)}>
          <form
            className="modal__body form-grid"
            onSubmit={async (event) => {
              event.preventDefault();
              setBusy("create-store");
              setMessage("");
              const form = new FormData(event.currentTarget);
              try {
                await api("/admin/sponsored-stores", {
                  method: "POST",
                  body: JSON.stringify({
                    slug: String(form.get("slug") ?? ""),
                    name: String(form.get("name") ?? ""),
                    description: String(form.get("description") ?? ""),
                    websiteUrl: optionalFormString(form, "websiteUrl"),
                    logoUrl: optionalFormString(form, "logoUrl"),
                    available: true,
                    sortOrder: Number(form.get("sortOrder") ?? 0),
                  }),
                });
                setStoreOpen(false);
                await refetch();
              } catch (error) {
                setMessage(error instanceof Error ? error.message : "The store could not be created.");
              } finally {
                setBusy("");
              }
            }}
          >
            <label>Store slug<input name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="discord" /></label>
            <label>Display name<input name="name" required minLength={2} maxLength={80} /></label>
            <label>Description<textarea name="description" required minLength={10} maxLength={500} /></label>
            <label>Official website URL<input name="websiteUrl" type="url" /></label>
            <label>Logo URL<input name="logoUrl" type="url" /></label>
            <label>Sort order<input name="sortOrder" type="number" defaultValue="0" /></label>
            <div className="modal__footer">
              <Button type="button" variant="ghost" onClick={() => setStoreOpen(false)}>Cancel</Button>
              <Button disabled={busy === "create-store"} type="submit">Create store</Button>
            </div>
          </form>
        </Modal>
      ) : null}
      {itemStore ? (
        <Modal title={`Add item to ${itemStore.name}`} onClose={() => setItemStore(null)}>
          <form
            className="modal__body form-grid"
            onSubmit={async (event) => {
              event.preventDefault();
              setBusy("create-item");
              setMessage("");
              const form = new FormData(event.currentTarget);
              try {
                await api(`/admin/sponsored-stores/${itemStore.id}/items`, {
                  method: "POST",
                  body: JSON.stringify({
                    slug: String(form.get("slug") ?? ""),
                    name: String(form.get("name") ?? ""),
                    description: String(form.get("description") ?? ""),
                    sparksPrice: Number(form.get("sparksPrice")),
                    imageUrl: optionalFormString(form, "imageUrl"),
                    fulfillmentSummary: String(form.get("fulfillmentSummary") ?? ""),
                    fulfillmentFields: form.getAll("fulfillmentFields"),
                    available: true,
                    sortOrder: Number(form.get("sortOrder") ?? 0),
                  }),
                });
                setItemStore(null);
                await refetch();
              } catch (error) {
                setMessage(error instanceof Error ? error.message : "The item could not be created.");
              } finally {
                setBusy("");
              }
            }}
          >
            <label>Item slug<input name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" /></label>
            <label>Item name<input name="name" required minLength={2} maxLength={100} /></label>
            <label>Description<textarea name="description" required minLength={10} maxLength={1000} /></label>
            <label>Sparks price<input name="sparksPrice" type="number" required min="1" /></label>
            <label>Image URL<input name="imageUrl" type="url" /></label>
            <label>Delivery summary<input name="fulfillmentSummary" required minLength={5} maxLength={300} placeholder="Delivered as a private gift link" /></label>
            <fieldset>
              <legend>Required player details</legend>
              <label><input type="checkbox" name="fulfillmentFields" value="MINECRAFT_USERNAME" /> Minecraft username</label>
              <label><input type="checkbox" name="fulfillmentFields" value="DISCORD_USERNAME" /> Discord username</label>
              <label><input type="checkbox" name="fulfillmentFields" value="EMAIL" /> Email</label>
            </fieldset>
            <label>Sort order<input name="sortOrder" type="number" defaultValue="0" /></label>
            <div className="modal__footer">
              <Button type="button" variant="ghost" onClick={() => setItemStore(null)}>Cancel</Button>
              <Button disabled={busy === "create-item"} type="submit">Create item</Button>
            </div>
          </form>
        </Modal>
      ) : null}
    </>
  );
}

export function AdminSponsoredPurchasesPage() {
  const [status, setStatus] = useState("");
  const { data: purchases = [], isLoading, refetch } = useAdminSponsoredPurchases(status);
  const [selected, setSelected] = useState<AdminSponsoredPurchase | null>(null);
  const [action, setAction] = useState<
    "START_PROCESSING" | "MARK_DELIVERED" | "CANCEL" | "REFUND" | "CANCEL_AND_REFUND"
  >("START_PROCESSING");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <>
      <AdminHeading
        title="Sponsored purchase operations"
        description="Review private delivery details, deliver gifts, update status, cancel requests, and return Sparks."
        action={
          <label className="admin-filter">
            Status
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">All statuses</option>
              {["REQUESTED", "PROCESSING", "DELIVERED", "CANCELLED", "REFUNDED"].map((value) => (
                <option value={value} key={value}>{value.replaceAll("_", " ")}</option>
              ))}
            </select>
          </label>
        }
      />
      <Card className="admin-policy-note">
        <LockKeyhole />
        <div>
          <h3>Private fulfillment workspace</h3>
          <p>Delivery identifiers are visible only to the purchaser and authorized Nortix admins. Every action requires confirmation and creates an audit record.</p>
        </div>
      </Card>
      {message ? <p role="status">{message}</p> : null}
      {isLoading ? <Card><p>Loading sponsored purchases…</p></Card> : null}
      <div className="admin-sponsored-purchase-list">
        {purchases.map((purchase) => (
          <button key={purchase.id} onClick={() => setSelected(purchase)}>
            <span>
              <strong>{purchase.item.name}</strong>
              <small>{purchase.item.store.name} · @{purchase.user.username}</small>
            </span>
            <span>
              {purchase.quantity} × item · {purchase.priceSparks.toLocaleString()} Sparks
            </span>
            <span>{new Date(purchase.createdAt).toLocaleString()}</span>
            <i className={`purchase-status purchase-status--${purchase.status.toLowerCase()}`}>
              {purchase.status.replaceAll("_", " ")}
            </i>
            <ChevronRight />
          </button>
        ))}
      </div>
      {!isLoading && purchases.length === 0 ? <Card><p>No purchases match this status.</p></Card> : null}
      {selected ? (
        <Modal title={`${selected.item.name} · @${selected.user.username}`} onClose={() => setSelected(null)}>
          <form
            className="modal__body form-grid"
            onSubmit={async (event) => {
              event.preventDefault();
              setBusy(true);
              setMessage("");
              const form = new FormData(event.currentTarget);
              try {
                await api(`/admin/sponsored-purchases/${selected.id}/actions`, {
                  method: "POST",
                  body: JSON.stringify({
                    action,
                    reason: optionalFormString(form, "reason"),
                    deliveryReference: optionalFormString(form, "deliveryReference"),
                    adminNote: optionalFormString(form, "adminNote"),
                    confirmation: "CONFIRM",
                  }),
                });
                setSelected(null);
                setMessage("Sponsored purchase updated and audited.");
                await refetch();
              } catch (error) {
                setMessage(error instanceof Error ? error.message : "The purchase could not be updated.");
              } finally {
                setBusy(false);
              }
            }}
          >
            <div className="admin-purchase-details">
              <span><strong>Status</strong>{selected.status.replaceAll("_", " ")}</span>
              <span><strong>Player</strong>{selected.user.displayName} (@{selected.user.username})</span>
              <span><strong>Quantity</strong>{selected.quantity}</span>
              <span><strong>Total Sparks charged</strong>{selected.priceSparks.toLocaleString()}</span>
              {Object.entries(selected.fulfillmentDetails).map(([key, value]) => (
                <span key={key}><strong>{key.replaceAll(/([A-Z])/g, " $1")}</strong><code>{value}</code></span>
              ))}
              {selected.deliveryReference ? <span><strong>Delivery reference</strong><code>{selected.deliveryReference}</code></span> : null}
            </div>
            <label>
              Action
              <select value={action} onChange={(event) => setAction(event.target.value as typeof action)}>
                <option value="START_PROCESSING">Start processing</option>
                <option value="MARK_DELIVERED">Mark delivered</option>
                <option value="CANCEL">Cancel without Sparks refund</option>
                <option value="REFUND">Refund Sparks</option>
                <option value="CANCEL_AND_REFUND">Cancel and refund Sparks</option>
              </select>
            </label>
            <label>Private delivery reference<textarea name="deliveryReference" defaultValue={selected.deliveryReference ?? ""} placeholder="Gift URL, redemption code, or delivery confirmation" /></label>
            <label>Player-visible reason<textarea name="reason" defaultValue={selected.statusReason ?? ""} placeholder="Required for cancellation and refunds" /></label>
            <label>Internal admin note<textarea name="adminNote" defaultValue={selected.adminNote ?? ""} /></label>
            <div className="admin-confirmation-note">
              {action === "REFUND" || action === "CANCEL_AND_REFUND" ? <RotateCcw /> : action === "MARK_DELIVERED" ? <Truck /> : <ShieldAlert />}
              <span>
                <strong>Confirm this action</strong>
                <small>It will update private purchase state, notify the player, and append an immutable audit record.</small>
              </span>
            </div>
            <div className="modal__footer">
              <Button type="button" variant="ghost" onClick={() => setSelected(null)}>Close</Button>
              <Button
                type="submit"
                variant={["CANCEL", "REFUND", "CANCEL_AND_REFUND"].includes(action) ? "danger" : "primary"}
                disabled={busy}
              >
                {busy ? "Updating…" : "Confirm action"}
              </Button>
            </div>
          </form>
        </Modal>
      ) : null}
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
  const supportedType = type === "users" || type === "servers" ? type : null;
  const { data: entityData = [], isLoading } = useQuery({
    queryKey: ["admin-entities", supportedType],
    queryFn: () => api<Array<Record<string, unknown>>>(`/admin/entities?type=${supportedType}`),
    enabled: Boolean(supportedType),
  });
  const rows: ManagedRecord[] = entityData.map((record) => {
    if (supportedType === "users") {
      return {
        id: String(record.id),
        name: String(record.displayName ?? record.username),
        type: "User",
        status: String(record.status),
        access: Array.isArray(record.roles) ? record.roles.join(", ") : "Player",
        updated: new Date(String(record.lastActiveAt)).toLocaleString(),
      };
    }
    const owner = record.owner as { displayName?: string; username?: string } | undefined;
    return {
      id: String(record.id),
      name: String(record.name),
      type: "Server",
      status: String(record.moderationStatus),
      access: `Owner: ${owner?.displayName ?? owner?.username ?? "Unknown"}`,
      updated: new Date(String(record.updatedAt)).toLocaleString(),
    };
  });
  const scopedRows =
    type === "users"
      ? rows.filter((row) => row.type === "User")
      : type === "servers"
        ? rows.filter((row) => row.type === "Server")
        : rows;
  const filtered = scopedRows.filter((row) =>
    `${row.name} ${row.type} ${row.status} ${row.access}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );

  return (
    <>
      <AdminHeading
        title={title}
        description={description}
        action={
          <Button>
            <Save /> Save view
          </Button>
        }
      />
      <Card className="data-card">
        <div className="data-card__header">
          <div>
            <h2>{title}</h2>
            <p>Search, inspect, edit, restrict, restore, or terminate records within your role.</p>
          </div>
          <label className="table-search">
            <Search />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search records..."
            />
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
                  <td>
                    <code>{row.id}</code>
                  </td>
                  <td>
                    <strong>{row.name}</strong>
                  </td>
                  <td>{row.type}</td>
                  <td>
                    <span className="admin-status">{row.status}</span>
                  </td>
                  <td>{row.access}</td>
                  <td>{row.updated}</td>
                  <td>
                    <button
                      className="icon-button"
                      disabled
                      title="Persisted editing endpoint not enabled"
                      aria-label={`Editing ${row.name} is unavailable`}
                    >
                      <ChevronRight />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      {isLoading && (
        <Card>
          <p>Loading seeded administration records…</p>
        </Card>
      )}
      {!supportedType && (
        <Card>
          <p>This tool has no persisted data endpoint yet. No example records are shown.</p>
        </Card>
      )}
    </>
  );
}

function _RecordEditor({
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
            <input
              value={draft.name}
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
            />
          </label>
          <label>
            Status
            <select
              value={draft.status}
              onChange={(event) => setDraft({ ...draft, status: event.target.value })}
            >
              <option>ACTIVE</option>
              <option>LIMITED</option>
              <option>UNDER_REVIEW</option>
              <option>SUSPENDED</option>
              <option>TERMINATED</option>
            </select>
          </label>
          <label>
            Access role
            <select
              value={draft.access}
              onChange={(event) => setDraft({ ...draft, access: event.target.value })}
            >
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
          <p>
            Type the record ID to enable termination. This would revoke access and preserve an audit
            record.
          </p>
          <input
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            placeholder={record.id}
          />
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
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={() => onSave({ ...draft, updated: "just now" })}>
          <Save /> Save audited changes
        </Button>
      </div>
    </Modal>
  );
}

function AdminMessagesPage() {
  const [composer, setComposer] = useState(false);
  const [sendingId, setSendingId] = useState("");
  const [actionError, setActionError] = useState("");
  const { data: messages = [], isLoading, isError, refetch } = useAdminMessages();
  const queryClient = useQueryClient();

  const sendDraft = async (id: string) => {
    setSendingId(id);
    setActionError("");
    try {
      await api(`/admin/messages/${id}/send`, { method: "POST" });
      await queryClient.invalidateQueries({ queryKey: ["admin-messages"] });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "The draft could not be sent.");
    } finally {
      setSendingId("");
    }
  };

  return (
    <>
      <AdminHeading
        title="Admin messages"
        description="Send targeted in-product messages, banners, policy notices, or urgent interventions."
        action={
          <Button onClick={() => setComposer(true)}>
            <Send /> New message
          </Button>
        }
      />
      <Card className="data-card">
        {actionError ? (
          <p className="admin-form-error" role="alert">
            {actionError}
          </p>
        ) : null}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Message</th>
                <th>Audience</th>
                <th>Status</th>
                <th>Delivery</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {messages.map((message) => (
                <tr key={message.id}>
                  <td>
                    <strong>{message.title}</strong>
                    <small className="admin-table-secondary">
                      {message.severity.toLowerCase()} · by{" "}
                      {message.createdBy.displayName ?? message.createdBy.username}
                    </small>
                    <small className="admin-table-secondary">{message.body}</small>
                  </td>
                  <td>
                    {message.audience === "USER"
                      ? `@${message.targetUser?.username ?? "account"}`
                      : message.audience.replaceAll("_", " ").toLowerCase()}
                  </td>
                  <td>
                    <span className="admin-status">{message.status.toLowerCase()}</span>
                  </td>
                  <td>
                    {message.status === "SENT"
                      ? `${message.deliveries.length}/${message._count.deliveries} read`
                      : "Not delivered"}
                  </td>
                  <td>
                    {message.status === "DRAFT" ? (
                      <button
                        className="admin-table-action"
                        disabled={sendingId === message.id}
                        onClick={() => sendDraft(message.id)}
                      >
                        <Send /> {sendingId === message.id ? "Sending…" : "Send draft"}
                      </button>
                    ) : (
                      <small>
                        {new Date(message.sentAt ?? message.createdAt).toLocaleString()}
                      </small>
                    )}
                  </td>
                </tr>
              ))}
              {isLoading ? (
                <tr>
                  <td colSpan={5}>Loading persisted messages…</td>
                </tr>
              ) : null}
              {isError ? (
                <tr>
                  <td colSpan={5}>
                    Messages could not be loaded. <button onClick={() => refetch()}>Retry</button>
                  </td>
                </tr>
              ) : null}
              {!isLoading && !isError && messages.length === 0 ? (
                <tr>
                  <td colSpan={5}>No messages or drafts yet.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>
      {composer && <AdminMessageComposer onClose={() => setComposer(false)} />}
    </>
  );
}

function AdminMessageComposer({ onClose }: { onClose: () => void }) {
  const [audience, setAudience] = useState("ALL_USERS");
  const [targetUsername, setTargetUsername] = useState("");
  const [severity, setSeverity] = useState("INFO");
  const [title, setTitle] = useState("Important Nortix update");
  const [body, setBody] = useState(
    "Nortix administrators have shared an update. Please review the latest platform guidance.",
  );
  const [actionUrl, setActionUrl] = useState("/dashboard/inbox");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const queryClient = useQueryClient();

  const submit = async (status: "DRAFT" | "SENT") => {
    setBusy(true);
    setError("");
    try {
      await api("/admin/messages", {
        method: "POST",
        body: JSON.stringify({
          audience,
          ...(audience === "USER" ? { targetUsername } : {}),
          severity,
          status,
          title,
          body,
          ...(actionUrl.trim() ? { actionUrl: actionUrl.trim() } : {}),
        }),
      });
      await queryClient.invalidateQueries({ queryKey: ["admin-messages"] });
      onClose();
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "The message could not be saved.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Compose admin message" onClose={onClose}>
      <div className="modal__body admin-editor">
        <label>
          Audience
          <select value={audience} onChange={(event) => setAudience(event.target.value)}>
            <option value="ALL_USERS">All accessible accounts</option>
            <option value="PLAYERS">Active players</option>
            <option value="SERVER_OWNERS">Active server owners</option>
            <option value="LIMITED_ACCOUNTS">Limited or reviewed accounts</option>
            <option value="USER">One account by username</option>
          </select>
        </label>
        {audience === "USER" ? (
          <label>
            Nortix username
            <input
              value={targetUsername}
              onChange={(event) => setTargetUsername(event.target.value)}
              placeholder="tester5"
            />
          </label>
        ) : null}
        <label>
          Severity
          <select value={severity} onChange={(event) => setSeverity(event.target.value)}>
            <option value="INFO">Information</option>
            <option value="SUCCESS">Resolved or successful</option>
            <option value="WARNING">Action recommended</option>
            <option value="CRITICAL">Critical account notice</option>
          </select>
        </label>
        <label>
          Title
          <input maxLength={100} value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <label>
          Message
          <textarea
            rows={5}
            maxLength={2000}
            value={body}
            onChange={(event) => setBody(event.target.value)}
          />
        </label>
        <label>
          Internal action path
          <input
            value={actionUrl}
            onChange={(event) => setActionUrl(event.target.value)}
            placeholder="/dashboard/inbox"
          />
        </label>
        <p className="admin-editor-note">
          Sent messages create private, persistent deliveries. Recipient selection, delivery count,
          and the sending administrator are written to the audit log.
        </p>
        {error ? (
          <p role="alert" className="admin-form-error">
            {error}
          </p>
        ) : null}
      </div>
      <div className="modal__footer">
        <Button variant="ghost" disabled={busy} onClick={() => submit("DRAFT")}>
          Save draft
        </Button>
        <Button disabled={busy} onClick={() => submit("SENT")}>
          <Send /> {busy ? "Working…" : "Send message"}
        </Button>
      </div>
    </Modal>
  );
}

function AdminAnalyticsPage({ type }: { type: string }) {
  const [range, setRange] = useState("7 days");
  const { data: overview } = useAdminOverview();
  const { data: auditLogs = [] } = useAuditLogs();
  return (
    <>
      <AdminHeading
        title={type === "umami" ? "Umami usage analytics" : "Product analytics"}
        description="Privacy-conscious traffic, engagement, campaign, search, and retention signals."
        action={
          <select
            className="admin-range"
            value={range}
            onChange={(event) => setRange(event.target.value)}
          >
            <option>24 hours</option>
            <option>7 days</option>
            <option>30 days</option>
          </select>
        }
      />
      <div className="admin-kpi-grid">
        {[
          ["Seeded users", (overview?.users ?? 0).toLocaleString(), "Database"],
          ["Seeded servers", (overview?.servers ?? 0).toLocaleString(), "Database"],
          ["Campaigns", (overview?.campaigns ?? 0).toLocaleString(), "Database"],
          ["Open cases", (overview?.openCases ?? 0).toLocaleString(), "Database"],
          ["Sparks adjustments", "—", "Database"],
          ["Audit events", auditLogs.length.toLocaleString(), "Latest page"],
        ].map(([label, value, trend]) => (
          <Card key={label}>
            <small>{label}</small>
            <strong>{value}</strong>
            <span className="positive">{trend}</span>
          </Card>
        ))}
      </div>
      <div className="admin-command-grid">
        <Card>
          <h2>Usage over time</h2>
          <div className="admin-chart" aria-label="Usage chart">
            {auditLogs.slice(0, 12).map((entry, index) => (
              <i style={{ height: `${Math.max(12, 100 - index * 7)}%` }} key={entry.id} />
            ))}
          </div>
        </Card>
        <Card>
          <h2>Top product routes</h2>
          {auditLogs.slice(0, 5).map((entry) => (
            <div className="analytics-route" key={entry.id}>
              <code>{entry.action}</code>
              <strong>{entry.entityType}</strong>
            </div>
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
          <label>
            Endpoint
            <input placeholder="https://analytics.example.com" />
          </label>
          <label>
            Website ID
            <input placeholder="Umami website ID" />
          </label>
        </div>
        <Button>
          <Save /> Save analytics configuration
        </Button>
      </Card>
    </>
  );
}

function AdminMonitorPage() {
  const [paused, setPaused] = useState(false);
  const { data: auditLogs = [] } = useAuditLogs();
  const events = paused ? [] : auditLogs.slice(0, 20);
  return (
    <>
      <AdminHeading
        title="Live activity monitor"
        description="Observe recent platform events, sessions, errors, moderation triggers, and unusual patterns."
        action={
          <Button variant="secondary" onClick={() => setPaused(!paused)}>
            {paused ? "Resume stream" : "Pause stream"}
          </Button>
        }
      />
      <div className="admin-command-grid">
        <Card>
          <h2>Live event stream</h2>
          <div className="live-event-stream">
            {events.map((event) => (
              <div key={event.id}>
                <i />
                <code>{event.action}</code>
                <span>{event.actor?.username ?? "system"}</span>
                <b>{event.entityType}</b>
                <small>{new Date(event.createdAt).toLocaleTimeString()}</small>
              </div>
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
              <span>
                <strong>{label}</strong>
                <small>{status}</small>
              </span>
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
  const { data, isLoading, isError, refetch } = useAuditLogs();
  const rows = (data ?? [])
    .map((entry) => [
      entry.actor?.displayName ?? entry.actor?.username ?? "System",
      entry.action,
      `${entry.entityType}:${entry.entityId}`,
      new Date(entry.createdAt).toLocaleString(),
    ])
    .filter((row) => row.join(" ").toLowerCase().includes(filter.toLowerCase()));
  return (
    <>
      <AdminHeading
        title="Activity logs"
        description="Search administrative, moderation, security, and system events."
      />
      {isLoading ? (
        <Card>
          <p>Loading seeded audit records…</p>
        </Card>
      ) : null}
      {isError ? (
        <Card>
          <p>Seeded audit records could not be loaded.</p>
          <Button onClick={() => refetch()}>Retry</Button>
        </Card>
      ) : null}
      <Card className="data-card">
        <div className="data-card__header">
          <label className="table-search">
            <Search />
            <input
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder="Filter logs..."
            />
          </label>
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
        <thead>
          <tr>
            <th>Actor</th>
            <th>Action</th>
            <th>Target</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.join("-")}>
              <td>{row[0]}</td>
              <td>
                <code>{row[1]}</code>
              </td>
              <td>{row[2]}</td>
              <td>{row[3]}</td>
            </tr>
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
      <AdminHeading
        title="Nortix staff access"
        description="Control platform staff roles with least-privilege defaults and audited changes. Server-team roles never grant access here."
      />
      <Card className="permission-matrix">
        <div className="permission-row permission-row--head">
          <b>Capability</b>
          <b>Moderator</b>
          <b>Analyst</b>
          <b>Nortix admin</b>
        </div>
        {[
          "Review reports",
          "Edit servers",
          "Edit users",
          "Send messages",
          "View analytics",
          "Terminate access",
          "Manage admin roles",
        ].map((capability, index) => (
          <div className="permission-row" key={capability}>
            <strong>{capability}</strong>
            <input type="checkbox" defaultChecked={index < 2} />
            <input type="checkbox" defaultChecked={index === 4} />
            <input type="checkbox" defaultChecked />
          </div>
        ))}
        <Button onClick={() => setSaved(true)}>
          <Save /> {saved ? "Permissions saved" : "Save permission matrix"}
        </Button>
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
        <label>
          Target ID
          <input
            value={target}
            onChange={(event) => setTarget(event.target.value)}
            placeholder="usr_102 or srv_014"
          />
        </label>
        <label>
          Reason
          <textarea rows={3} placeholder="Required moderation or security reason" />
        </label>
        <label>
          Type TERMINATE {target || "TARGET"}
          <input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
        </label>
        <div className="termination-options">
          <label>
            <input type="checkbox" defaultChecked /> Revoke active sessions
          </label>
          <label>
            <input type="checkbox" defaultChecked /> Disable new authentication
          </label>
          <label>
            <input type="checkbox" /> Unpublish associated content
          </label>
          <label>
            <input type="checkbox" /> Schedule data retention review
          </label>
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
