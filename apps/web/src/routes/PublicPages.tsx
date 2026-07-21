import {
  ArrowRight,
  BarChart3,
  Check,
  ChevronRight,
  Clock3,
  Compass,
  Eye,
  Gamepad2,
  Globe2,
  HeartHandshake,
  MessageSquareText,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  WalletCards,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Badge, Button, Card, Sparks, VerifiedBadge } from "@nortix/ui";
import { formatMoney } from "@nortix/shared";
import { CampaignCard } from "../components/CampaignCard";
import { Modal } from "../components/Modal";
import { ServerCard } from "../components/ServerCard";
import { CampaignDetailRedesign } from "../components/CampaignDetailRedesign";
import { Seo } from "../components/Seo";
import {
  artIndexFor,
  usePublicCampaigns,
  usePublicProfile,
  usePublicServer,
  usePublicServers,
} from "../features/api-data";
import { useI18n } from "../lib/i18n";

const profileBackgrounds = new Set(["slate", "violet", "ocean", "moss", "ember"]);

export function PublicProfilePage() {
  const { username } = useParams();
  const { data: profile, isLoading, isError } = usePublicProfile(username);
  if (isLoading) return <div className="content-page narrow-page"><Card><p>Loading profile…</p></Card></div>;
  if (isError || !profile) return <div className="content-page narrow-page"><Card><h1>Profile unavailable</h1><p>This profile may be private or no longer exists.</p></Card></div>;
  const background = profileBackgrounds.has(profile.publicProfile.backgroundColor ?? "")
    ? profile.publicProfile.backgroundColor
    : "slate";
  return (
    <div className="content-page narrow-page public-profile-page">
      <Card className="profile-card">
        <div className={`profile-banner profile-banner--${background}`}>
          <span className="profile-avatar">{profile.username.slice(0, 2).toUpperCase()}</span>
        </div>
        <div className="profile-card__body">
          <div>
            <h1>{profile.displayName} <ShieldCheck /></h1>
            <p>@{profile.username}</p>
            {profile.publicProfile.bio ? <p className="public-profile-bio">{profile.publicProfile.bio}</p> : null}
          </div>
          <Badge tone="success">Nortix tester</Badge>
        </div>
        {profile.publicProfile.showReputation !== false ? (
          <div className="profile-stats">
            <span><strong>{profile.reputationScore ?? 0}</strong><small>Reputation</small></span>
            <span><strong>{profile.testerLevel ?? 0}</strong><small>Tester level</small></span>
            <span><strong>{profile.reputationTier ?? "New Tester"}</strong><small>Tier</small></span>
          </div>
        ) : null}
      </Card>
    </div>
  );
}

export function HomePage() {
  const { data: campaignData } = usePublicCampaigns();
  const { data: serverData } = usePublicServers();
  const campaigns = campaignData?.items ?? [];
  const featuredCampaign = campaigns[0];
  return (
    <>
      <section className="hero">
        <div className="hero__grid" aria-hidden />
        <div className="hero__copy">
          <Badge tone="success">Verified Minecraft playtests</Badge>
          <h1>
            PLAY. TEST.
            <br />
            <span>DISCOVER.</span>
          </h1>
          <p>
            Discover new Minecraft servers, complete verified playtests, and get rewarded for useful
            participation.
          </p>
          <div className="hero__actions">
            <Link className="button button--primary button--large" to="/campaigns">
              Browse Campaigns <ArrowRight />
            </Link>
            <Link className="button button--secondary button--large" to="/how-it-works">
              How It Works
            </Link>
          </div>
          <div className="trust-row">
            <span>
              <ShieldCheck /> Moderated campaigns
            </span>
            <span>
              <Target /> Clear milestones
            </span>
            <span>
              <HeartHandshake /> Useful participation
            </span>
          </div>
        </div>
        <div className="hero__visual">
          <div className="hero-console">
            <div className="hero-console__top">
              <span>
                <i />
                <i />
                <i />
              </span>
              <small>NORTIX LIVE SIGNAL</small>
            </div>
            <div className="hero-world">
              <span className="world-sun" />
              <span className="block block--1" />
              <span className="block block--2" />
              <span className="block block--3" />
              <span className="player-figure" />
            </div>
            <div className="hero-console__campaign">
              <div>
                <span className="server-mini-logo">
                  {featuredCampaign?.server.name.slice(0, 2).toUpperCase() ?? "NX"}
                </span>
                <span>
                  <strong>{featuredCampaign?.title ?? "Loading active campaign…"}</strong>
                  <small>Skyblock X · Verified</small>
                </span>
              </div>
              <div className="hero-reward">
                <small>POTENTIAL REWARD</small>
                <strong>Up to {featuredCampaign?.maximumSparksReward ?? "—"} Sparks</strong>
              </div>
            </div>
            <div className="hero-milestones">
              <span className="done">
                <Check /> Join server
              </span>
              <i />
              <span>
                <b>2</b> Complete tutorial
              </span>
              <i />
              <span>
                <b>3</b> Share feedback
              </span>
            </div>
          </div>
          <Card className="floating-stat floating-stat--players">
            <Users />
            <span>
              <strong>148</strong>
              <small>testing now</small>
            </span>
          </Card>
          <Card className="floating-stat floating-stat--verified">
            <ShieldCheck />
            <span>
              <strong>Verified</strong>
              <small>owner & campaign</small>
            </span>
          </Card>
        </div>
      </section>

      <section className="social-proof">
        <div>
          <strong>{serverData?.total ?? "—"}</strong>
          <span>verified servers</span>
        </div>
        <div>
          <strong>{campaignData?.total ?? "—"}</strong>
          <span>active playtests</span>
        </div>
        <div>
          <strong>1,940+</strong>
          <span>useful feedback signals</span>
        </div>
        <div>
          <strong>4.8/5</strong>
          <span>community experience</span>
        </div>
      </section>

      <section className="section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">LIVE OPPORTUNITIES</span>
            <h2>Playtests worth your time</h2>
            <p>
              Clear requirements, visible rewards, and servers ready to learn from real players.
            </p>
          </div>
          <Link to="/campaigns">
            View all campaigns <ChevronRight />
          </Link>
        </div>
        <div className="campaign-grid">
          {campaigns.slice(0, 3).map((campaign, index) => (
            <CampaignCard campaign={campaign} featured={index === 0} key={campaign.id} />
          ))}
        </div>
      </section>

      <section className="how-strip">
        <div className="section-heading section-heading--center">
          <div>
            <span className="eyebrow">HOW IT WORKS</span>
            <h2>A fair loop for players and owners</h2>
          </div>
        </div>
        <div className="steps-grid">
          <Card>
            <span className="step-number">01</span>
            <Compass />
            <h3>Find your next server</h3>
            <p>
              Browse verified communities and moderated playtests that match your edition, version,
              and interests.
            </p>
          </Card>
          <Card>
            <span className="step-number">02</span>
            <Gamepad2 />
            <h3>Complete clear milestones</h3>
            <p>
              Follow public instructions, play honestly, and submit the evidence requested for each
              milestone.
            </p>
          </Card>
          <Card>
            <span className="step-number">03</span>
            <MessageSquareText />
            <h3>Share useful feedback</h3>
            <p>
              Help owners understand where their onboarding, gameplay, or performance can improve.
            </p>
          </Card>
          <Card>
            <span className="step-number">04</span>
            <Zap />
            <h3>Receive verified rewards</h3>
            <p>
              Approved milestones add to Earnings, while Sparks unlock cosmetic progression across
              Nortix.
            </p>
          </Card>
        </div>
      </section>

      <section className="owner-callout">
        <div>
          <span className="eyebrow">FOR SERVER OWNERS</span>
          <h2>Turn first-time visitors into useful player insights.</h2>
          <p>
            Launch moderated campaigns, recruit verified testers, and see where players stay,
            progress, or leave.
          </p>
          <div className="check-list">
            <span>
              <Check /> Structured milestone templates
            </span>
            <span>
              <Check /> Moderated player recruitment
            </span>
            <span>
              <Check /> Funnel and feedback analytics
            </span>
          </div>
          <Link className="button button--primary" to="/for-server-owners">
            Explore owner tools <ArrowRight />
          </Link>
        </div>
        <div className="analytics-preview">
          <div className="analytics-preview__header">
            <span>Onboarding funnel</span>
            <Badge tone="success">Live</Badge>
          </div>
          <div className="funnel-row">
            <span>Campaign views</span>
            <b>2,840</b>
            <i>
              <em style={{ width: "100%" }} />
            </i>
          </div>
          <div className="funnel-row">
            <span>Playtest joins</span>
            <b>684</b>
            <i>
              <em style={{ width: "72%" }} />
            </i>
          </div>
          <div className="funnel-row">
            <span>Server connects</span>
            <b>593</b>
            <i>
              <em style={{ width: "58%" }} />
            </i>
          </div>
          <div className="funnel-row">
            <span>Tutorial completes</span>
            <b>419</b>
            <i>
              <em style={{ width: "41%" }} />
            </i>
          </div>
          <div className="analytics-preview__stats">
            <span>
              <small>Completion rate</small>
              <strong>61.3%</strong>
            </span>
            <span>
              <small>Avg. session</small>
              <strong>47 min</strong>
            </span>
            <span>
              <small>Day-7 return</small>
              <strong>Insufficient data</strong>
            </span>
          </div>
        </div>
      </section>

      <section className="safety-banner">
        <ShieldCheck />
        <div>
          <span className="eyebrow">BUILT FOR TRUST</span>
          <h2>Useful participation, protected by clear rules.</h2>
          <p>
            Campaigns are reviewed, milestone rewards require verification, and uncertain risk
            signals go to human review.
          </p>
        </div>
        <Link className="button button--secondary" to="/safety">
          Read our safety approach
        </Link>
      </section>
    </>
  );
}

export function BrowseServersPage() {
  const { t, formatNumber } = useI18n();
  const [search, setSearch] = useState("");
  const [edition, setEdition] = useState("ALL");
  const { data, isLoading, isError, refetch } = usePublicServers();
  const servers = data?.items ?? [];
  const visible = useMemo(
    () =>
      servers.filter(
        (server) =>
          (edition === "ALL" || server.edition === edition) &&
          `${server.name} ${server.description} ${server.categories.join(" ")}`
            .toLowerCase()
            .includes(search.toLowerCase()),
      ),
    [search, edition],
  );
  return (
    <div className="listing-page">
      <div className="listing-hero">
        <span className="eyebrow">{t("listing.serverEyebrow")}</span>
        <h1>{t("listing.serverTitle")}</h1>
        <p>{t("listing.serverDescription")}</p>
      </div>
      <div className="filter-bar">
        <label>
          <Search />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("listing.searchServers")}
          />
        </label>
        <div className="segmented">
          {["ALL", "JAVA", "BEDROCK"].map((item) => (
            <button
              className={edition === item ? "active" : ""}
              onClick={() => setEdition(item)}
              key={item}
            >
              {item === "ALL" ? t("listing.allEditions") : item}
            </button>
          ))}
        </div>
        <span>{t("listing.serverCount", { count: formatNumber(visible.length) })}</span>
      </div>
      <div className="server-grid">
        {isLoading ? (
          <Card>
            <p>{t("listing.loadingServers")}</p>
          </Card>
        ) : null}
        {isError ? (
          <Card>
            <p>{t("listing.serverError")}</p>
            <Button onClick={() => refetch()}>{t("listing.retry")}</Button>
          </Card>
        ) : null}
        {visible.map((server) => (
          <ServerCard server={server} key={server.id} />
        ))}
      </div>
    </div>
  );
}

export function BrowseCampaignsPage() {
  const { t, formatNumber } = useI18n();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("__all__");
  const { data, isLoading, isError, refetch } = usePublicCampaigns();
  const campaigns = data?.items ?? [];
  const categories = ["__all__", ...new Set(campaigns.map((campaign) => campaign.category))];
  const visible = campaigns.filter(
    (campaign) =>
      (category === "__all__" || campaign.category === category) &&
      `${campaign.title} ${campaign.server.name} ${campaign.category}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <div className="listing-page">
      <div className="listing-hero listing-hero--campaigns">
        <span className="eyebrow">{t("listing.campaignEyebrow")}</span>
        <h1>{t("listing.campaignTitle")}</h1>
        <p>{t("listing.campaignDescription")}</p>
      </div>
      <div className="filter-bar">
        <label>
          <Search />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("listing.searchCampaigns")}
          />
        </label>
        <div className="segmented">
          {categories.map((item) => (
            <button
              className={category === item ? "active" : ""}
              onClick={() => setCategory(item)}
              key={item}
            >
              {item === "__all__" ? t("listing.all") : item}
            </button>
          ))}
        </div>
        <span>{t("listing.playtestCount", { count: formatNumber(visible.length) })}</span>
      </div>
      <div className="campaign-grid campaign-grid--listing">
        {isLoading ? (
          <Card>
            <p>{t("home.loading")}</p>
          </Card>
        ) : null}
        {isError ? (
          <Card>
            <p>{t("listing.campaignError")}</p>
            <Button onClick={() => refetch()}>{t("listing.retry")}</Button>
          </Card>
        ) : null}
        {visible.map((campaign) => (
          <CampaignCard campaign={campaign} key={campaign.id} />
        ))}
      </div>
    </div>
  );
}

export function ServerDetailPage() {
  const { slug } = useParams();
  const { data: server, isLoading, isError, refetch } = usePublicServer(slug);
  const { data: campaignData } = usePublicCampaigns();
  const [addressCopied, setAddressCopied] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  if (isLoading) {
    return (
      <div className="detail-page">
        <Card>
          <p>Loading server…</p>
        </Card>
      </div>
    );
  }
  if (isError || !server) {
    return (
      <div className="detail-page">
        <Card>
          <p>The server could not be loaded.</p>
          <Button onClick={() => refetch()}>Retry</Button>
        </Card>
      </div>
    );
  }
  const related = (campaignData?.items ?? []).filter(
    (campaign) => campaign.server.id === server.id,
  );
  const isDiscovered = server.source === "DISCOVERED";
  const defaultPort = server.edition === "BEDROCK" ? 19132 : 25565;
  const serverAddress = server.hostname
    ? `${server.hostname}${server.port && server.port !== defaultPort ? `:${server.port}` : ""}`
    : "";
  const copyServerAddress = async () => {
    if (!serverAddress) return;
    try {
      await navigator.clipboard.writeText(serverAddress);
      setAddressCopied(true);
      window.setTimeout(() => setAddressCopied(false), 2_000);
    } catch {
      setAddressCopied(false);
    }
  };
  const canonicalPath = `/servers/${server.slug}`;
  const serverSchema = {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: server.name,
    description: server.description,
    url: `https://hub.nortixlabs.com${canonicalPath}`,
    gamePlatform:
      server.edition === "JAVA" ? "Minecraft: Java Edition" : "Minecraft: Bedrock Edition",
    applicationCategory: server.categories.join(", "),
    aggregateRating:
      server.rating != null && server.reviewCount
        ? {
            "@type": "AggregateRating",
            ratingValue: server.rating,
            reviewCount: server.reviewCount,
            bestRating: 5,
            worstRating: 1,
          }
        : undefined,
    publisher: { "@id": "https://hub.nortixlabs.com/#organization" },
  };
  return (
    <div className="detail-page">
      <Seo
        title={`${server.name} Minecraft Server`}
        description={`${server.description} View editions, versions, categories, player activity, reviews, and active Nortix playtests.`}
        path={canonicalPath}
        jsonLd={serverSchema}
      />
      <div className="server-detail-hero">
        {server.logoUrl ? <img className="server-detail-hero__backdrop" src={server.logoUrl} alt="" aria-hidden="true" /> : null}
        <div className="server-detail-hero__logo">
          {server.logoUrl ? <img src={server.logoUrl} alt={`${server.name} icon`} /> : server.name.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <div className="detail-title-row">
            <h1>{server.name}</h1>
            {isDiscovered ? <Badge tone="neutral">Public listing</Badge> : <VerifiedBadge />}
          </div>
          <p>{server.description}</p>
          <div className="chip-row">
            {server.categories.map((tag) => (
              <Badge key={tag}>{tag}</Badge>
            ))}
            <Badge tone="info">{server.edition}</Badge>
            {server.versions.map((version) => (
              <Badge key={version}>{version}</Badge>
            ))}
          </div>
        </div>
        <div className="server-connect">
          <span className={server.online ? "online" : undefined}>
            <i /> {server.online ? "Online" : "Offline"} ·{" "}
            {(server.playerCount ?? 0).toLocaleString()} players
          </span>
          <button
            className="button button--primary"
            disabled={!serverAddress}
            onClick={() => void copyServerAddress()}
          >
            {addressCopied ? "Address copied" : "Copy server address"}
          </button>
        </div>
      </div>
      <div className="detail-columns">
        <div className="detail-content">
          <Card>
            <h2>About {server.name}</h2>
            <p>{server.description}</p>
            {!isDiscovered ? (
              <p>
                The server team has completed Nortix ownership verification and follows the
                guidelines for public listings and campaigns.
              </p>
            ) : null}
            <div className="feature-list">
              {isDiscovered ? (
                <span>
                  <Globe2 /> Public server listing
                </span>
              ) : (
                <span>
                  <ShieldCheck /> Verified ownership
                </span>
              )}
              <span>
                <Users /> Live server status
              </span>
              <span>
                {isDiscovered ? (
                  <>
                    <ShieldCheck /> Not yet Nortix verified
                  </>
                ) : (
                  <>
                    <MessageSquareText /> Player feedback welcomed
                  </>
                )}
              </span>
            </div>
          </Card>
          <section>
            <div className="section-heading">
              <div>
                <h2>Active playtests</h2>
                <p>Eligible activity may receive Sparks while helping this server improve.</p>
              </div>
            </div>
            {related.length ? (
              related.map((campaign) => <CampaignCard campaign={campaign} key={campaign.id} />)
            ) : (
              <Card>
                <p>
                  {isDiscovered
                    ? "This public listing has no Nortix campaigns. Its owner can register and verify it to create campaigns."
                    : "No active campaign right now. You can still join and review this server."}
                </p>
              </Card>
            )}
          </section>
          <Card>
            <h2>Community reviews</h2>
            <div className="review-summary">
              <strong>{server.rating ?? "New"}</strong>
              <span>
                <span className="stars">★★★★★</span>
                <small>
                  {isDiscovered
                    ? "Reviews become available after Nortix verification"
                    : "Based on verified community reviews"}
                </small>
              </span>
            </div>
            {(server.reviews ?? []).map((review) => (
              <div className="review" key={review.id}>
                <span className="avatar">{review.player.username.slice(0, 2).toUpperCase()}</span>
                <div>
                  <strong>
                    {review.player.displayName ?? review.player.username}
                    {review.campaignLinked ? <Badge tone="success">Campaign linked</Badge> : null}
                  </strong>
                  <span className="stars">{"★".repeat(review.rating)}</span>
                  <p>{review.text}</p>
                </div>
              </div>
            ))}
            {(server.reviews ?? []).length === 0 ? (
              <p>
                {isDiscovered
                  ? "This listing has not been claimed and verified on Nortix."
                  : "No approved reviews yet."}
              </p>
            ) : null}
          </Card>
        </div>
        <aside className="detail-aside">
          <Card>
            <h3>Server details</h3>
            <dl>
              <div>
                <dt>Edition</dt>
                <dd>{server.edition}</dd>
              </div>
              {serverAddress ? (
                <div>
                  <dt>Address</dt>
                  <dd>{serverAddress}</dd>
                </div>
              ) : null}
              <div>
                <dt>Versions</dt>
                <dd>{server.versions.join(", ")}</dd>
              </div>
              <div>
                <dt>Players online</dt>
                <dd>{(server.playerCount ?? 0).toLocaleString()}</dd>
              </div>
              <div>
                <dt>Community rating</dt>
                <dd>{server.rating == null ? "No reviews yet" : `${server.rating}/5`}</dd>
              </div>
              {isDiscovered && server.lastCheckedAt ? (
                <div>
                  <dt>Status checked</dt>
                  <dd>{new Date(server.lastCheckedAt).toLocaleString()}</dd>
                </div>
              ) : null}
            </dl>
          </Card>
          <Card className="report-card">
            <ShieldCheck />
            <h3>Stay safe</h3>
            <p>Server rules still apply. Report suspicious requirements or behavior to Nortix.</p>
            <button
              className="button button--ghost"
              onClick={() => {
                setReportSubmitted(false);
                setReportOpen(true);
              }}
            >
              Report server
            </button>
          </Card>
        </aside>
      </div>
      {reportOpen ? (
        <Modal
          title="Report server"
          className="modal--compact"
          onClose={() => {
            setReportOpen(false);
            setReportSubmitted(false);
          }}
        >
          {reportSubmitted ? (
            <div className="modal__body report-form__success">
              <strong>Thanks for helping keep Nortix safe.</strong>
              <p>Your report is ready to be reviewed by the Nortix team.</p>
              <div className="modal__footer">
                <Button
                  type="button"
                  onClick={() => {
                    setReportOpen(false);
                    setReportSubmitted(false);
                  }}
                >
                  Done
                </Button>
              </div>
            </div>
          ) : (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                setReportSubmitted(true);
              }}
            >
              <div className="modal__body report-form">
                <p>Tell us what seems unsafe, misleading, or against Nortix guidelines.</p>
                <label>
                  Reason
                  <select
                    required
                    value={reportReason}
                    onChange={(event) => setReportReason(event.target.value)}
                  >
                    <option value="">Select a reason</option>
                    <option value="misleading">Misleading listing</option>
                    <option value="unsafe">Unsafe or abusive behavior</option>
                    <option value="scam">Suspicious requirements or scam</option>
                    <option value="other">Something else</option>
                  </select>
                </label>
                <label>
                  Description
                  <textarea
                    required
                    minLength={10}
                    rows={4}
                    value={reportDescription}
                    onChange={(event) => setReportDescription(event.target.value)}
                    placeholder="Include what happened and any useful details."
                  />
                </label>
              </div>
              <div className="modal__footer">
                <button
                  className="button button--ghost"
                  type="button"
                  onClick={() => {
                    setReportOpen(false);
                    setReportReason("");
                    setReportDescription("");
                  }}
                >
                  Cancel
                </button>
                <Button type="submit">Submit report</Button>
              </div>
            </form>
          )}
        </Modal>
      ) : null}
    </div>
  );
}

export function CampaignDetailPage() {
  return <CampaignDetailRedesign />;
}

export function LegacyCampaignDetailPage() {
  const { id } = useParams();
  const { data } = usePublicCampaigns();
  const rawCampaign = data?.items.find((item) => item.id === id) ?? data?.items[0];
  if (!rawCampaign) return <CampaignDetailRedesign />;
  const campaign = {
    ...rawCampaign,
    version: rawCampaign.versionRequirements[0] ?? rawCampaign.server.versions[0] ?? "Any version",
    difficulty: rawCampaign.category,
    language: "Server supported",
    rewardCents: 0,
    sparksMinimum: rawCampaign.minimumSparksReward,
    sparks: rawCampaign.maximumSparksReward,
    duration: `Ends ${new Date(rawCampaign.endsAt).toLocaleDateString()}`,
    participants: rawCampaign._count.participations,
    region: rawCampaign.regionRestrictions.length
      ? rawCampaign.regionRestrictions.join(" · ")
      : "Worldwide",
    potentialExposure: {
      minimum: rawCampaign.potentialExposureMin,
      maximum: rawCampaign.potentialExposureMax,
    },
    server: {
      ...rawCampaign.server,
      art: artIndexFor(rawCampaign.server.id),
      rating: rawCampaign.server.rating ?? 0,
    },
    milestones: rawCampaign.milestones.map((milestone) => ({
      ...milestone,
      description: milestone.publicInstructions,
      duration: milestone.verificationMethod.replaceAll("_", " ").toLowerCase(),
      rewardCents: 0,
      sparks: milestone.sparksReward,
    })),
  };
  const [joining, setJoining] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [joined, setJoined] = useState(false);
  return (
    <div className="detail-page campaign-detail">
      <div className={`campaign-detail-hero server-art--${campaign.server.art}`}>
        <div className="breadcrumbs">
          <Link to="/campaigns">Campaigns</Link>
          <ChevronRight />
          {campaign.server.name}
        </div>
        <div className="campaign-detail-hero__body">
          <div>
            <Badge tone="success">Active playtest</Badge>
            <h1>{campaign.title}</h1>
            <div className="campaign-card__server">
              <Link to={`/servers/${campaign.server.slug}`}>{campaign.server.name}</Link>
              <VerifiedBadge />
            </div>
            <p>{campaign.description}</p>
            <div className="chip-row">
              <Badge>{campaign.version}</Badge>
              <Badge>{campaign.category}</Badge>
              <Badge>{campaign.difficulty}</Badge>
              <Badge>{campaign.language}</Badge>
            </div>
          </div>
          <Card className="join-card">
            <span>Available reward</span>
            <strong>{formatMoney(campaign.rewardCents)}</strong>
            <Sparks value={`${campaign.sparks.toLocaleString()} Sparks`} />
            <hr />
            <div>
              <span>
                <Clock3 /> Estimated time
              </span>
              <b>{campaign.duration}</b>
            </div>
            <div>
              <Users />
              <span>{campaign.participants} active participants</span>
            </div>
            <div>
              <Globe2 />
              <span>{campaign.region}</span>
            </div>
            {joined ? (
              <Link className="button button--primary" to="/dashboard/progress">
                View your progress
              </Link>
            ) : (
              <Button onClick={() => setJoining(true)}>Join campaign</Button>
            )}
            <small>Rewards are issued after milestone verification.</small>
          </Card>
        </div>
      </div>
      <div className="detail-columns">
        <div className="detail-content">
          <Card>
            <h2>What you’ll do</h2>
            <div className="milestone-timeline">
              {campaign.milestones.map((milestone, index) => (
                <div key={milestone.id}>
                  <span>{index + 1}</span>
                  <div>
                    <h3>{milestone.title}</h3>
                    <p>{milestone.description}</p>
                    <small>
                      <Clock3 /> {milestone.duration}
                    </small>
                  </div>
                  <div className="milestone-reward">
                    <strong>{formatMoney(milestone.rewardCents)}</strong>
                    <Sparks value={milestone.sparks} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <h2>Server information</h2>
            <div className="server-inline">
              <span className={`server-inline__logo server-art--${campaign.server.art}`}>
                {campaign.server.name.slice(0, 2)}
              </span>
              <div>
                <strong>
                  {campaign.server.name} <VerifiedBadge />
                </strong>
                <p>{campaign.server.description}</p>
                <Link to={`/servers/${campaign.server.slug}`}>View server profile →</Link>
              </div>
            </div>
          </Card>
          <Card>
            <h2>Eligibility</h2>
            <div className="eligibility-grid">
              <span>
                <Check /> Minecraft {campaign.version}
              </span>
              <span>
                <Check /> {campaign.region}
              </span>
              <span>
                <Check /> One completion per person
              </span>
              <span>
                <Check /> Verified email required
              </span>
            </div>
          </Card>
          <Card className="terms-summary">
            <ShieldCheck />
            <div>
              <h2>Fair play & verification</h2>
              <p>
                Fraudulent, duplicated, or incomplete submissions can be rejected. Server rules
                apply, and participation does not guarantee approval when requirements are not met.
              </p>
            </div>
          </Card>
        </div>
        <aside className="detail-aside">
          <Card>
            <h3>Reward summary</h3>
            <dl>
              <div>
                <dt>Milestone rewards</dt>
                <dd>{formatMoney(campaign.rewardCents)}</dd>
              </div>
              <div>
                <dt>Sparks</dt>
                <dd>{campaign.sparks.toLocaleString()}</dd>
              </div>
              <div>
                <dt>Verification</dt>
                <dd>Manual review</dd>
              </div>
              <div>
                <dt>Typical review</dt>
                <dd>1–2 days</dd>
              </div>
            </dl>
          </Card>
          <Card>
            <h3>Community signal</h3>
            <div className="review-summary review-summary--small">
              <strong>{campaign.server.rating}</strong>
              <span>
                <span className="stars">★★★★★</span>
                <small>Server experience</small>
              </span>
            </div>
          </Card>
          <Card className="report-card">
            <Eye />
            <h3>See something wrong?</h3>
            <p>Report unsafe or misleading campaign instructions.</p>
            <button className="button button--ghost">Report campaign</button>
          </Card>
        </aside>
      </div>
      {joining && (
        <Modal title="Join this playtest" onClose={() => setJoining(false)}>
          <div className="modal__body">
            <p>
              Review these terms before joining <strong>{campaign.title}</strong>.
            </p>
            <ul className="modal-list">
              <li>Rewards are added only after each milestone is verified.</li>
              <li>Duplicated, fraudulent, or incomplete submissions may be rejected.</li>
              <li>The server’s community rules still apply while you participate.</li>
              <li>You may leave at any time; incomplete milestones are not rewarded.</li>
            </ul>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(event) => setAccepted(event.target.checked)}
              />
              <span>I understand and accept the campaign terms.</span>
            </label>
          </div>
          <div className="modal__footer">
            <Button variant="ghost" onClick={() => setJoining(false)}>
              Cancel
            </Button>
            <Button
              disabled={!accepted}
              onClick={() => {
                setJoined(true);
                setJoining(false);
              }}
            >
              Accept & join campaign
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

export function HowItWorksPage({ owners = false }: { owners?: boolean }) {
  const playerSteps = [
    [
      Search,
      "Browse verified playtests",
      "Filter campaigns by edition, version, time, region, and difficulty.",
    ],
    [
      Target,
      "Review clear milestones",
      "See every required step, estimated duration, reward, and verification method before joining.",
    ],
    [
      Gamepad2,
      "Play and participate",
      "Follow server rules, complete the milestones honestly, and submit requested evidence.",
    ],
    [
      WalletCards,
      "Receive verified rewards",
      "Approved rewards appear in Earnings. Sparks remain separate and unlock cosmetics.",
    ],
  ] as const;
  const ownerSteps = [
    [
      Compass,
      "Add and verify your server",
      "Submit ownership evidence through a manual review designed for the first release.",
    ],
    [
      Target,
      "Build a moderated campaign",
      "Choose approved milestone templates and configure a fair, testable player journey.",
    ],
    [
      Users,
      "Recruit useful testers",
      "Reach players who match your version, region, and reputation requirements.",
    ],
    [
      BarChart3,
      "Learn where players leave",
      "Review completion funnels and structured feedback without invented retention claims.",
    ],
  ] as const;
  const steps = owners ? ownerSteps : playerSteps;
  return (
    <div className="content-page">
      <section className="content-hero">
        <span className="eyebrow">{owners ? "FOR SERVER OWNERS" : "FOR PLAYERS"}</span>
        <h1>
          {owners
            ? "Turn first-time visitors into useful player insights."
            : "Useful playtests. Clear milestones. Fair rewards."}
        </h1>
        <p>
          {owners
            ? "Launch moderated campaigns, recruit verified testers, and see where players stay, progress, or leave."
            : "Discover new communities and help server teams improve with specific, verified participation."}
        </p>
        <Link
          className="button button--primary button--large"
          to={owners ? "/register" : "/campaigns"}
        >
          {owners ? "Create an owner profile" : "Browse campaigns"} <ArrowRight />
        </Link>
      </section>
      <section className="section">
        <div className="steps-grid">
          {steps.map(([Icon, title, description], index) => (
            <Card key={title}>
              <span className="step-number">0{index + 1}</span>
              <Icon />
              <h3>{title}</h3>
              <p>{description}</p>
            </Card>
          ))}
        </div>
      </section>
      <section className="info-split">
        <div>
          <span className="eyebrow">
            {owners ? "CONTROL WITH GUARDRAILS" : "TWO SEPARATE REWARD SYSTEMS"}
          </span>
          <h2>
            {owners
              ? "You configure the playtest. Nortix protects the experience."
              : "Earnings and Sparks serve different purposes."}
          </h2>
          <p>
            {owners
              ? "Owners select approved milestone templates, audiences, schedules, and capacity. Nortix controls acceptable ranges, verification methods, moderation, and public rewards."
              : "Earnings are withdrawable rewards for approved milestones. Sparks have no cash value and are spent only on cosmetic or non-financial progression."}
          </p>
        </div>
        <Card className={owners ? "control-card" : "systems-card"}>
          {owners ? (
            <>
              <h3>Campaign controls</h3>
              <span>
                <Check /> Approved milestone templates
              </span>
              <span>
                <Check /> Transparent campaign usage
              </span>
              <span>
                <Check /> Manual review for first launch
              </span>
              <span>
                <Check /> Replaceable Minecraft integrations
              </span>
            </>
          ) : (
            <>
              <div>
                <WalletCards />
                <span>
                  <strong>Earnings</strong>
                  <small>Available to withdraw after verification</small>
                </span>
              </div>
              <div>
                <Sparkles />
                <span>
                  <strong>Sparks</strong>
                  <small>Cosmetics and progression · no cash value</small>
                </span>
              </div>
            </>
          )}
        </Card>
      </section>
    </div>
  );
}

const legalContent: Record<
  string,
  { eyebrow: string; title: string; intro: string; sections: Array<[string, string]> }
> = {
  safety: {
    eyebrow: "TRUST & SAFETY",
    title: "Playtests should feel safe, clear, and worth your time.",
    intro:
      "Nortix combines campaign moderation, human review, privacy-conscious risk signals, and direct reporting tools.",
    sections: [
      [
        "Campaign review",
        "Campaigns are checked for clear requirements, acceptable milestones, reasonable durations, and prohibited requests before publication.",
      ],
      [
        "Reward verification",
        "Milestone rewards are issued after verification. Duplicate or fraudulent submissions may be rejected, with dispute review available.",
      ],
      [
        "Privacy-conscious risk review",
        "We limit collection to necessary signals and use uncertain indicators to create review flags, not automatic permanent bans.",
      ],
      [
        "Community safety",
        "Server rules still apply, but Nortix can pause campaigns, hide listings, and investigate reports when platform guidelines are breached.",
      ],
    ],
  },
  guidelines: {
    eyebrow: "COMMUNITY GUIDELINES",
    title: "Be useful. Be honest. Respect the community.",
    intro:
      "These guidelines apply to players, server owners, moderators, reviews, feedback, and campaign participation.",
    sections: [
      [
        "For players",
        "Complete milestones honestly, provide specific feedback, respect server rules, and never submit duplicate or fabricated evidence.",
      ],
      [
        "For owners",
        "Create achievable requirements, never ask for sensitive information, do not retaliate over criticism, and describe your server accurately.",
      ],
      [
        "Reviews and feedback",
        "Public reviews should describe real experiences. Private campaign feedback is shared with the relevant owner and moderation team.",
      ],
      [
        "Enforcement",
        "Nortix may limit, review, suspend, or ban accounts for confirmed abuse. Uncertain cases are reviewed proportionately.",
      ],
    ],
  },
  terms: {
    eyebrow: "TERMS PLACEHOLDER",
    title: "Platform terms for an early public prototype.",
    intro:
      "This placeholder summarizes the product’s intended rules and must be replaced with reviewed legal terms before commercial launch.",
    sections: [
      [
        "Campaign participation",
        "Joining a campaign does not guarantee reward approval. Published milestones and evidence requirements determine eligibility.",
      ],
      [
        "Rewards and withdrawals",
        "Approved earnings may be withdrawn after applicable thresholds, review, country availability, and provider requirements.",
      ],
      [
        "Sparks",
        "Sparks are non-withdrawable platform points with no cash value. They cannot be transferred or converted into earnings.",
      ],
      [
        "Service changes",
        "Features, campaigns, and integrations may change during the prototype period. Material changes will be communicated clearly.",
      ],
    ],
  },
  privacy: {
    eyebrow: "PRIVACY PLACEHOLDER",
    title: "Collect what is needed. Protect what is sensitive.",
    intro:
      "This placeholder describes the intended privacy posture and must be reviewed before production launch.",
    sections: [
      [
        "Account data",
        "Nortix stores identity, profile, campaign, moderation, and ledger data needed to operate the service.",
      ],
      [
        "Fraud prevention",
        "Privacy-conscious signals may be used to identify suspicious patterns. Raw sensitive data is restricted and minimized.",
      ],
      [
        "Minecraft integrations",
        "Future plugins and mods will report only documented events necessary for verification, analytics, and player-requested features.",
      ],
      [
        "Your choices",
        "Public profile visibility, optional integrations, and future rewarded-ad interactions are designed to be user-controlled.",
      ],
    ],
  },
};

export function LegalPage({ type }: { type: keyof typeof legalContent }) {
  const content = legalContent[type]!;
  return (
    <div className="content-page narrow-page">
      <section className="content-hero">
        <span className="eyebrow">{content.eyebrow}</span>
        <h1>{content.title}</h1>
        <p>{content.intro}</p>
      </section>
      <section className="legal-sections">
        {content.sections.map(([title, body]) => (
          <Card key={title}>
            <h2>{title}</h2>
            <p>{body}</p>
          </Card>
        ))}
      </section>
    </div>
  );
}

export function ContactPage() {
  return (
    <div className="content-page narrow-page">
      <section className="content-hero">
        <span className="eyebrow">CONTACT</span>
        <h1>Talk with the Nortix team.</h1>
        <p>
          Questions about a campaign, server ownership, safety report, or early access? Send a
          message and we’ll route it to the right team.
        </p>
      </section>
      <Card className="contact-card">
        <form onSubmit={(event) => event.preventDefault()}>
          <label>
            Name
            <input placeholder="Your name" />
          </label>
          <label>
            Email
            <input type="email" placeholder="you@example.com" />
          </label>
          <label>
            Topic
            <select>
              <option>General question</option>
              <option>Campaign support</option>
              <option>Server ownership</option>
              <option>Safety report</option>
              <option>Partnership</option>
            </select>
          </label>
          <label>
            Message
            <textarea rows={6} placeholder="Tell us what you need help with…" />
          </label>
          <Button type="submit">Send message</Button>
        </form>
        <aside>
          <ShieldCheck />
          <h2>Need to report something?</h2>
          <p>
            Include the campaign or server name, what happened, and any relevant timestamps. Do not
            send passwords or raw financial information.
          </p>
          <a href="mailto:safety@nortixlabs.com">safety@nortixlabs.com</a>
        </aside>
      </Card>
    </div>
  );
}
