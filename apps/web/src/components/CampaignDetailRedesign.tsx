import {
  Check,
  ChevronRight,
  Clock3,
  Globe2,
  Info,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@nortix/ui";
import { campaigns } from "../features/demo-data";
import { Modal } from "./Modal";

export function CampaignDetailRedesign() {
  const { id } = useParams();
  const campaign = campaigns.find((item) => item.id === id) ?? campaigns[0]!;
  const [joining, setJoining] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [joined, setJoined] = useState(false);

  return (
    <div className="campaign-v2">
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
              <small>{campaign.region.replace("Worldwide", "US · CA · GB")}</small>
            </span>
          </div>
          <span className="campaign-v2__status">Active playtest</span>
          <h1>{campaign.title}</h1>
          <p>{campaign.description}</p>
          <div className="campaign-v2__chips">
            <span>{campaign.version}</span>
            <span>{campaign.category}</span>
            <span>{campaign.difficulty}</span>
            <span>{campaign.language}</span>
          </div>
        </div>

        <aside className="campaign-v2__join">
          <small>Potential reward</small>
          <div className="campaign-v2__reward">
            <strong>Up to {campaign.sparks}</strong>
            <Info />
          </div>
          <span>
            <Sparkles /> Sparks
          </span>
          <hr />
          <dl>
            <div>
              <dt>
                <Clock3 /> Estimated time
              </dt>
              <dd>{campaign.duration}</dd>
            </div>
            <div>
              <dt>
                <Users /> Active participants
              </dt>
              <dd>{campaign.participants}</dd>
            </div>
            <div>
              <dt>
                <Globe2 /> Region
              </dt>
              <dd>{campaign.region.replace("Worldwide", "US · CA · GB")}</dd>
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
                  <p>{milestone.description}</p>
                  <small>
                    <Clock3 /> {milestone.duration}
                  </small>
                </div>
                <div className="campaign-v2__milestone-reward">
                  <span>
                    <Sparkles /> Up to {milestone.sparks}
                  </span>
                </div>
              </article>
            ))}
          </div>
          <div className="campaign-v2__complete">
            <Star />
            <span>
              Completing all verified steps could provide{" "}
              <b>up to {campaign.sparks.toLocaleString()} Sparks.</b>
            </span>
          </div>
        </section>

        <aside className="campaign-v2__summary">
          <section>
            <h2>Reward summary</h2>
            <dl>
              <div>
                <dt>Potential Sparks</dt>
                <dd>Up to {campaign.sparks.toLocaleString()}</dd>
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
          </section>

          <section className="campaign-v2__community">
            <h2>Community signal</h2>
            <div className="campaign-v2__rating">
              <strong>{campaign.server.rating}</strong>
              <span>
                <b>★★★★★</b>
                <small>Server experience</small>
              </span>
            </div>
            <div className="campaign-v2__signals">
              <span>
                <MessageSquareText />
                <b>1.2K</b>
                <small>Reviews</small>
              </span>
              <span>
                <ShieldCheck />
                <b>92%</b>
                <small>Positive</small>
              </span>
              <span>
                <Clock3 />
                <b>24h</b>
                <small>Response time</small>
              </span>
            </div>
          </section>
        </aside>
      </div>

      {joining && (
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
