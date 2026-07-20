import {
  Check,
  ChevronRight,
  Clock3,
  Globe2,
  Info,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@nortix/ui";
import { usePublicCampaign } from "../features/api-data";
import { api } from "../lib/api";
import { Modal } from "./Modal";
import { accountCreationUrl } from "../lib/auth-session";
import { Seo } from "./Seo";

export function CampaignDetailRedesign() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: campaign, isLoading, isError, refetch } = usePublicCampaign(id);
  const [joining, setJoining] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [joined, setJoined] = useState(false);
  const [joinMessage, setJoinMessage] = useState("");

  if (isLoading) {
    return <div className="campaign-v2"><p>Loading seeded campaign…</p></div>;
  }
  if (isError || !campaign) {
    return (
      <div className="campaign-v2">
        <p>The seeded campaign could not be loaded.</p>
        <Button onClick={() => refetch()}>Retry</Button>
      </div>
    );
  }

  const versions = campaign.versionRequirements.length
    ? campaign.versionRequirements
    : campaign.server.versions;
  const region = campaign.regionRestrictions.length
    ? campaign.regionRestrictions.join(" · ")
    : "Worldwide";
  const canonicalPath = `/campaigns/${campaign.id}`;
  const campaignSchema = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: campaign.title,
    description: campaign.description,
    url: `https://hub.nortixlabs.com${canonicalPath}`,
    eventStatus:
      campaign.status === "ACTIVE"
        ? "https://schema.org/EventScheduled"
        : "https://schema.org/EventCompleted",
    eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
    startDate: campaign.startsAt,
    endDate: campaign.endsAt,
    location: {
      "@type": "VirtualLocation",
      url: `https://hub.nortixlabs.com/servers/${campaign.server.slug}`,
    },
    organizer: {
      "@type": "Organization",
      name: campaign.server.name,
      url: `https://hub.nortixlabs.com/servers/${campaign.server.slug}`,
    },
    isAccessibleForFree: true,
  };

  const joinCampaign = async () => {
    setJoinMessage("");
    try {
      await api(`/campaigns/${campaign.id}/join`, {
        method: "POST",
        body: JSON.stringify({ acceptedTerms: true }),
      });
      setJoined(true);
      setJoining(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "The campaign could not be joined.";
      if (/auth|account|sign in|unauthorized/i.test(message)) {
        navigate(accountCreationUrl(`/campaigns/${campaign.id}`, "campaign"));
        return;
      }
      setJoinMessage(message);
    }
  };

  return (
    <div className="campaign-v2">
      <Seo
        title={`${campaign.title} – ${campaign.server.name} Playtest`}
        description={`${campaign.description} Complete ${campaign.milestones.length} clear milestones; eligible verified activity may receive up to ${campaign.maximumSparksReward} Sparks.`}
        path={canonicalPath}
        type="article"
        jsonLd={campaignSchema}
      />
      <nav className="campaign-v2__breadcrumbs" aria-label="Breadcrumb">
        <Link to="/campaigns">Campaigns</Link>
        <ChevronRight />
        <Link to={`/servers/${campaign.server.slug}`}>{campaign.server.name}</Link>
        <ChevronRight />
        <span>{campaign.title}</span>
      </nav>

      <section className="campaign-v2__hero">
        <div className="campaign-v2__media" aria-label="Campaign artwork placeholder" />
        <div className="campaign-v2__hero-copy">
          <div className="campaign-v2__server">
            <span className="server-image-placeholder" aria-label="Server image placeholder" />
            <span>
              <strong>
                {campaign.server.name} <Check />
              </strong>
              <small>{region}</small>
            </span>
          </div>
          <span className="campaign-v2__status">{campaign.status.toLowerCase()} playtest</span>
          <h1>{campaign.title}</h1>
          <p>{campaign.description}</p>
          <div className="campaign-v2__chips">
            <span>{versions.join(", ") || "Any version"}</span>
            <span>{campaign.category}</span>
            <span>{campaign.milestones.length} milestones</span>
            <span>{campaign.automaticVerification ? "Automatic checks" : "System review"}</span>
          </div>
        </div>

        <aside className="campaign-v2__join">
          <small>Potential reward</small>
          <div className="campaign-v2__reward">
            <strong>
              {campaign.minimumSparksReward}–{campaign.maximumSparksReward}
            </strong>
            <Info />
          </div>
          <span>
            <Sparkles /> Sparks
          </span>
          <hr />
          <dl>
            <div>
              <dt>
                <Clock3 /> Campaign ends
              </dt>
              <dd>{new Date(campaign.endsAt).toLocaleDateString()}</dd>
            </div>
            <div>
              <dt>
                <Users /> Active participants
              </dt>
              <dd>{campaign._count.participations}</dd>
            </div>
            <div>
              <dt>
                <Globe2 /> Region
              </dt>
              <dd>{region}</dd>
            </div>
            <div>
              <dt>
                <Users /> Potential exposure
              </dt>
              <dd>
                {campaign.potentialExposureMin}–{campaign.potentialExposureMax}
              </dd>
            </div>
          </dl>
          {joined ? (
            <Link className="campaign-v2__join-button" to="/dashboard/progress">
              View your progress <ChevronRight />
            </Link>
          ) : (
            <button className="campaign-v2__join-button" onClick={() => setJoining(true)}>
              Join campaign <ChevronRight />
            </button>
          )}
          <small>Eligible activity may receive Sparks after verification.</small>
        </aside>
      </section>

      <div className="campaign-v2__content-grid">
        <section className="campaign-v2__tasks">
          <h2>What you’ll do</h2>
          <div className="campaign-v2__milestones">
            {campaign.milestones.map((milestone, index) => (
              <article key={milestone.id}>
                <span className="campaign-v2__step">{index + 1}</span>
                <div className="milestone-image-placeholder" aria-label="Milestone image placeholder" />
                <div className="campaign-v2__milestone-copy">
                  <h3>{milestone.title}</h3>
                  <p>{milestone.publicInstructions}</p>
                  <small>
                    <ShieldCheck /> {milestone.verificationMethod.replaceAll("_", " ").toLowerCase()}
                  </small>
                </div>
                <div className="campaign-v2__milestone-reward">
                  <span>
                    <Sparkles /> Up to {milestone.sparksReward}
                  </span>
                </div>
              </article>
            ))}
          </div>
          <div className="campaign-v2__complete">
            <Star />
            <span>
              Completing all verified steps could provide{" "}
              <b>
                {campaign.minimumSparksReward.toLocaleString()}–
                {campaign.maximumSparksReward.toLocaleString()} Sparks.
              </b>
            </span>
          </div>
        </section>

        <aside className="campaign-v2__summary">
          <section>
            <h2>Reward summary</h2>
            <dl>
              <div>
                <dt>Potential Sparks</dt>
                <dd>
                  {campaign.minimumSparksReward.toLocaleString()}–
                  {campaign.maximumSparksReward.toLocaleString()}
                </dd>
              </div>
              <div>
                <dt>Verification</dt>
                <dd>{campaign.automaticVerification ? "Automatic plugin checks" : "System review"}</dd>
              </div>
              <div>
                <dt>Exceptions</dt>
                <dd>Unusual activity may be held</dd>
              </div>
            </dl>
          </section>
        </aside>
      </div>

      {joining ? (
        <Modal title="Join this playtest" onClose={() => setJoining(false)}>
          <div className="modal__body">
            <p>
              Review these terms before joining <strong>{campaign.title}</strong>.
            </p>
            <ul className="modal-list">
              <li>Verified milestones may provide Sparks up to the published limit.</li>
              <li>Duplicated, fraudulent, or incomplete submissions may be rejected.</li>
              <li>The server’s community rules still apply while you participate.</li>
              <li>You may leave at any time; incomplete milestones would not qualify.</li>
            </ul>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(event) => setAccepted(event.target.checked)}
              />
              <span>I understand and accept the campaign terms.</span>
            </label>
            {joinMessage ? <p role="alert">{joinMessage}</p> : null}
          </div>
          <div className="modal__footer">
            <Button variant="ghost" onClick={() => setJoining(false)}>
              Cancel
            </Button>
            <Button disabled={!accepted} onClick={joinCampaign}>
              Accept & join campaign
            </Button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
