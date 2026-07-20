import {
  Activity,
  BarChart3,
  Check,
  Gamepad2,
  Globe2,
  Save,
  Server,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";

export function OwnerWorkspace() {
  const location = useLocation();
  const [saved, setSaved] = useState(false);
  const creating = location.pathname.includes("campaigns/new");

  return (
    <div className="dashboard-page owner-spark-workspace">
      <div className="dashboard-heading">
        <div>
          <span className="eyebrow">SERVER OWNER WORKSPACE</span>
          <h1>{creating ? "Create a campaign" : "Skyblock X control room"}</h1>
          <p>
            {creating
              ? "Set clear tasks and a cautious, verification-dependent Sparks limit."
              : "Manage your listing, campaigns, community signals, and Sparks limits."}
          </p>
        </div>
        <Link className="button button--secondary" to={creating ? "/owner" : "/owner/campaigns/new"}>
          {creating ? "Back to workspace" : "New campaign"}
        </Link>
      </div>

      {creating ? (
        <section className="owner-campaign-builder card">
          <div className="form-grid form-grid--two">
            <label>
              Campaign title
              <input defaultValue="First island experience" />
            </label>
            <label>
              Potential Sparks limit
              <select defaultValue="100">
                <option value="25">Up to 25 Sparks</option>
                <option value="50">Up to 50 Sparks</option>
                <option value="75">Up to 75 Sparks</option>
                <option value="100">Up to 100 Sparks</option>
              </select>
            </label>
            <label className="span-two">
              Player-facing description
              <textarea
                rows={4}
                defaultValue="Help us review the first-session experience. Eligible verified activity may receive Sparks up to the published limit."
              />
            </label>
          </div>
          <div className="owner-builder-steps">
            {[
              ["Connect and begin", "Up to 25 Sparks"],
              ["Complete the welcome path", "Up to 35 Sparks"],
              ["Share structured feedback", "Up to 40 Sparks"],
            ].map(([title, value], index) => (
              <div key={title}>
                <b>{index + 1}</b>
                <span>
                  <strong>{title}</strong>
                  <small>Could qualify after manual verification.</small>
                </span>
                <em>{value}</em>
              </div>
            ))}
          </div>
          <button className="button button--primary" onClick={() => setSaved(true)}>
            <Save /> {saved ? "Draft saved" : "Save campaign draft"}
          </button>
        </section>
      ) : (
        <>
          <div className="owner-control-stats">
            {[
              { Icon: Server, label: "Listing status", value: "Published", note: "Last reviewed 2 days ago" },
              { Icon: Gamepad2, label: "Active campaigns", value: "2", note: "Both within policy" },
              { Icon: Sparkles, label: "Highest Sparks limit", value: "Up to 100", note: "Verification required" },
              { Icon: Users, label: "Responses this week", value: "184", note: "May include repeat visits" },
            ].map(({ Icon, label, value, note }) => (
              <article className="card" key={label}>
                <span><Icon /></span>
                <small>{label}</small>
                <strong>{value}</strong>
                <p>{note}</p>
              </article>
            ))}
          </div>
          <div className="owner-workspace-grid">
            <section className="card">
              <h2>Campaign controls</h2>
              {["First island experience", "Tutorial clarity study", "Returning player check-in"].map(
                (name, index) => (
                  <div className="owner-control-row" key={name}>
                    <span>
                      <strong>{name}</strong>
                      <small>{index === 2 ? "Draft" : "Active · manual verification"}</small>
                    </span>
                    <b>{index === 0 ? "Up to 100 Sparks" : "Up to 75 Sparks"}</b>
                    <button>{index === 2 ? "Edit" : "Manage"}</button>
                  </div>
                ),
              )}
            </section>
            <section className="card">
              <h2>Recent feedback themes</h2>
              {[
                ["Tutorial pacing", "62% mentioned clarity"],
                ["Spawn navigation", "18 reports this week"],
                ["Return intent", "Could improve after day one"],
              ].map(([title, note]) => (
                <div className="owner-signal" key={title}>
                  <Activity />
                  <span>
                    <strong>{title}</strong>
                    <small>{note}</small>
                  </span>
                </div>
              ))}
            </section>
          </div>
        </>
      )}
    </div>
  );
}

export function UnifiedInfoPage({
  type,
}: {
  type: "players" | "owners" | "safety" | "guidelines" | "terms" | "privacy";
}) {
  const content = {
    players: {
      eyebrow: "FOR PLAYERS",
      title: "Contribute to better servers.",
      description:
        "Explore optional playtests, complete clear tasks, and potentially receive up to 100 Sparks when activity is eligible and verified.",
      points: ["Clear campaign steps", "Verification-dependent Sparks", "Daily quests and streaks"],
    },
    owners: {
      eyebrow: "FOR SERVER OWNERS",
      title: "Learn from real player activity.",
      description:
        "Publish structured campaigns, review useful signals, and set cautious Sparks limits without guaranteed language.",
      points: ["Campaign moderation", "Feedback themes", "Configurable Sparks limits"],
    },
    safety: {
      eyebrow: "TRUST & SAFETY",
      title: "Safety is an operating system.",
      description:
        "Nortix may review servers, campaigns, user activity, reports, and access when platform integrity could be affected.",
      points: ["Human moderation", "Appeals and audit trails", "Proportionate access controls"],
    },
    guidelines: {
      eyebrow: "COMMUNITY GUIDELINES",
      title: "Be useful, honest, and respectful.",
      description:
        "Feedback should be specific and genuine. Attempts to manipulate verification, Sparks, or other users could lead to restrictions.",
      points: ["No manipulation", "Respect server rules", "Report unsafe behavior"],
    },
    terms: {
      eyebrow: "TERMS",
      title: "Clear participation terms.",
      description:
        "Campaign participation is optional. Published Sparks values are upper limits, not promises, and eligibility may depend on verification and policy.",
      points: ["No guaranteed Sparks", "Activity may be reviewed", "Access could be limited"],
    },
    privacy: {
      eyebrow: "PRIVACY",
      title: "Use only what the platform needs.",
      description:
        "Nortix may process account, campaign, moderation, device, and activity signals to operate and protect the service.",
      points: ["Purpose-limited data", "Restricted admin access", "Logged administrative actions"],
    },
  }[type];

  return (
    <div className="dashboard-page unified-info-page">
      <span className="eyebrow">{content.eyebrow}</span>
      <h1>{content.title}</h1>
      <p>{content.description}</p>
      <div>
        {content.points.map((point, index) => {
          const icons = [ShieldCheck, BarChart3, Globe2];
          const Icon = icons[index]!;
          return (
            <article className="card" key={point}>
              <Icon />
              <h2>{point}</h2>
              <p>Details may vary by campaign, account status, region, and moderation context.</p>
              <Check />
            </article>
          );
        })}
      </div>
      <Link className="button button--primary" to={type === "owners" ? "/owner" : "/campaigns"}>
        {type === "owners" ? "Open owner workspace" : "Explore campaigns"}
      </Link>
    </div>
  );
}
