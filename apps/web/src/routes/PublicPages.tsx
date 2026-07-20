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
import { campaigns, servers } from "../features/demo-data";

export function HomePage() {
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
                <span className="server-mini-logo">SX</span>
                <span>
                  <strong>First island experience</strong>
                  <small>Skyblock X · Verified</small>
                </span>
              </div>
              <div className="hero-reward">
                <small>AVAILABLE REWARD</small>
                <strong>$3.00</strong>
                <Sparks value="1,000" />
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
          <strong>12</strong>
          <span>verified servers</span>
        </div>
        <div>
          <strong>8</strong>
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
  const [search, setSearch] = useState("");
  const [edition, setEdition] = useState("ALL");
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
        <span className="eyebrow">SERVER DISCOVERY</span>
        <h1>Discover Minecraft servers worth playing.</h1>
        <p>
          Browse verified communities across Java and Bedrock, with or without an active playtest.
        </p>
      </div>
      <div className="filter-bar">
        <label>
          <Search />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search servers or categories"
          />
        </label>
        <div className="segmented">
          {["ALL", "JAVA", "BEDROCK"].map((item) => (
            <button
              className={edition === item ? "active" : ""}
              onClick={() => setEdition(item)}
              key={item}
            >
              {item === "ALL" ? "All editions" : item}
            </button>
          ))}
        </div>
        <span>{visible.length} servers</span>
      </div>
      <div className="server-grid">
        {visible.map((server) => (
          <ServerCard server={server} key={server.id} />
        ))}
      </div>
    </div>
  );
}

export function BrowseCampaignsPage() {
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState("All");
  const visible = campaigns.filter(
    (campaign) =>
      (difficulty === "All" || campaign.difficulty === difficulty) &&
      `${campaign.title} ${campaign.server.name} ${campaign.category}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <div className="listing-page">
      <div className="listing-hero listing-hero--campaigns">
        <span className="eyebrow">VERIFIED PLAYTESTS</span>
        <h1>Play. Test. Earn rewards.</h1>
        <p>
          Join moderated campaigns, complete clear milestones, and receive rewards from Nortix after
          verification.
        </p>
      </div>
      <div className="filter-bar">
        <label>
          <Search />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search campaigns or servers"
          />
        </label>
        <div className="segmented">
          {["All", "Easy", "Moderate", "Advanced"].map((item) => (
            <button
              className={difficulty === item ? "active" : ""}
              onClick={() => setDifficulty(item)}
              key={item}
            >
              {item}
            </button>
          ))}
        </div>
        <span>{visible.length} playtests</span>
      </div>
      <div className="campaign-grid campaign-grid--listing">
        {visible.map((campaign) => (
          <CampaignCard campaign={campaign} key={campaign.id} />
        ))}
      </div>
    </div>
  );
}

export function ServerDetailPage() {
  const { slug } = useParams();
  const server = servers.find((item) => item.slug === slug) ?? servers[0]!;
  const related = campaigns.filter((campaign) => campaign.server.id === server.id);
  return (
    <div className="detail-page">
      <div className={`server-detail-hero server-art--${server.art}`}>
        <div className="server-detail-hero__logo">{server.name.slice(0, 2).toUpperCase()}</div>
        <div>
          <div className="detail-title-row">
            <h1>{server.name}</h1>
            <VerifiedBadge />
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
          <span className="online">
            <i /> Online · {server.playerCount.toLocaleString()} players
          </span>
          <button className="button button--primary">Copy server address</button>
        </div>
      </div>
      <div className="detail-columns">
        <div className="detail-content">
          <Card>
            <h2>About {server.name}</h2>
            <p>
              {server.description} The server team has completed Nortix ownership verification and
              follows the community guidelines for public listings and campaigns.
            </p>
            <div className="feature-list">
              <span>
                <ShieldCheck /> Verified ownership
              </span>
              <span>
                <Users /> Active community
              </span>
              <span>
                <MessageSquareText /> Player feedback welcomed
              </span>
            </div>
          </Card>
          <section>
            <div className="section-heading">
              <div>
                <h2>Active playtests</h2>
                <p>Earn rewards by helping this server improve.</p>
              </div>
            </div>
            {related.length ? (
              related.map((campaign) => <CampaignCard campaign={campaign} key={campaign.id} />)
            ) : (
              <Card>
                <p>No active campaign right now. You can still join and review this server.</p>
              </Card>
            )}
          </section>
          <Card>
            <h2>Community reviews</h2>
            <div className="review-summary">
              <strong>{server.rating}</strong>
              <span>
                <span className="stars">★★★★★</span>
                <small>Based on verified community reviews</small>
              </span>
            </div>
            <div className="review">
              <span className="avatar">PF</span>
              <div>
                <strong>
                  PixelFern <Badge tone="success">Campaign linked</Badge>
                </strong>
                <span className="stars">★★★★★</span>
                <p>
                  Clear onboarding and a surprisingly helpful community. The first island upgrade
                  path made sense after the recent changes.
                </p>
              </div>
            </div>
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
              <div>
                <dt>Versions</dt>
                <dd>{server.versions.join(", ")}</dd>
              </div>
              <div>
                <dt>Players online</dt>
                <dd>{server.playerCount.toLocaleString()}</dd>
              </div>
              <div>
                <dt>Community rating</dt>
                <dd>{server.rating}/5</dd>
              </div>
            </dl>
          </Card>
          <Card className="report-card">
            <ShieldCheck />
            <h3>Stay safe</h3>
            <p>Server rules still apply. Report suspicious requirements or behavior to Nortix.</p>
            <button className="button button--ghost">Report server</button>
          </Card>
        </aside>
      </div>
    </div>
  );
}

export function CampaignDetailPage() {
  return <CampaignDetailRedesign />;
}

export function LegacyCampaignDetailPage() {
  const { id } = useParams();
  const campaign = campaigns.find((item) => item.id === id) ?? campaigns[0]!;
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
