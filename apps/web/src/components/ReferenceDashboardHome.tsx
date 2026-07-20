import { ArrowRight, BadgeCheck, Compass, Gamepad2, Search, Sparkles, Users } from "lucide-react";
import { Link } from "react-router-dom";

const featured = [
  ["HOT", "Skyblock X", "Skyblock", "Economy", "1.20.4", "Up to 100 Sparks", "1,243", 0],
  ["NEW", "PrisonCraft", "Prison", "PvP", "1.20.2", "Up to 95 Sparks", "982", 1],
  ["ACTIVE", "Lifesteal SMP", "SMP", "PvP", "1.20.4", "Up to 90 Sparks", "765", 2],
  ["TRENDING", "Factions Legacy", "Factions", "PvP", "1.20.4", "Up to 85 Sparks", "654", 3],
] as const;

const campaignRows = [
  [
    "Vanilla Frontier",
    "A fresh vanilla experience. Pure survival.",
    "Survival",
    "Vanilla",
    "1.20.4",
    "Up to 65",
    "423",
    7,
  ],
  [
    "Arcane Realms",
    "Magic, quests, and an open world adventure.",
    "RPG",
    "Quests",
    "1.20.2",
    "Up to 80",
    "331",
    4,
  ],
  [
    "Bedwars Classic",
    "Competitive maps, fair queues, useful feedback.",
    "Minigames",
    "Bedwars",
    "1.20.4",
    "Up to 75",
    "812",
    5,
  ],
  [
    "OneBlock Journey",
    "Turn one block into a world worth exploring.",
    "Skyblock",
    "Survival",
    "1.20.2",
    "Up to 70",
    "298",
    6,
  ],
] as const;

export function ReferenceDashboardHome() {
  return (
    <div className="dashboard-page dashboard-home">
      <section className="home-hero">
        <div className="home-hero__media" aria-label="Campaign artwork placeholder" />
        <div className="home-hero__copy">
          <span>PLAY. TEST. CONTRIBUTE.</span>
          <h1>Make every session count.</h1>
          <p>Help ambitious Minecraft servers grow. Verified activity may receive Sparks.</p>
          <div>
            <Link className="button button--primary" to="/dashboard/campaigns">
              <Gamepad2 /> Browse campaigns
            </Link>
            <Link className="button button--glass" to="/how-it-works">
              <Compass /> How it works
            </Link>
          </div>
        </div>
      </section>

      <section className="home-section">
        <div className="home-section__heading">
          <div>
            <h2>
              <Sparkles /> Featured campaigns
            </h2>
            <p>Hand-picked campaigns that may offer up to 100 Sparks.</p>
          </div>
          <Link to="/dashboard/campaigns">
            View all <ArrowRight />
          </Link>
        </div>
        <div className="featured-campaigns">
          {featured.map(
            ([label, name, category, mode, version, reward, players, art], index) => (
              <Link
                className="featured-tile"
                to={`/campaigns/campaign-${index + 1}`}
                key={name}
              >
                <div className={`featured-tile__art server-art--${art}`}>
                  <span className={`featured-label featured-label--${index}`}>{label}</span>
                  <b>{name}</b>
                </div>
                <div className="featured-tile__body">
                  <h3>
                    {name} <BadgeCheck />
                  </h3>
                  <div className="featured-tile__tags">
                    <span>{category}</span>
                    <span>{mode}</span>
                    <span>{version}</span>
                  </div>
                  <div className="featured-tile__meta">
                    <strong>{reward}</strong>
                    <span>
                      <Users /> {players}
                    </span>
                  </div>
                </div>
              </Link>
            ),
          )}
        </div>
      </section>

      <section className="home-section campaign-directory">
        <div className="home-section__heading campaign-directory__heading">
          <h2>
            <Gamepad2 /> All campaigns
          </h2>
          <div className="campaign-filters">
            <button>All categories</button>
            <button>All versions</button>
            <button>Sort: Recommended</button>
            <label>
              <Search />
              <input aria-label="Search campaigns" placeholder="Search campaigns..." />
            </label>
          </div>
        </div>

        <div className="campaign-list">
          {campaignRows.map(
            ([name, description, category, mode, version, reward, players, art], index) => (
              <div className="campaign-row" key={name}>
                <div className={`campaign-row__art server-art--${art}`} aria-hidden="true">
                  {name
                    .split(" ")
                    .map((part) => part[0])
                    .join("")
                    .slice(0, 2)}
                </div>
                <div className="campaign-row__copy">
                  <h3>
                    {name} <BadgeCheck />
                  </h3>
                  <p>{description}</p>
                </div>
                <div className="campaign-row__tags">
                  <span>{category}</span>
                  <span>{mode}</span>
                  <span>{version}</span>
                </div>
                <strong>{reward} Sparks</strong>
                <span className="campaign-row__players">
                  <Users /> {players}
                </span>
                <Link
                  className="button button--primary button--small"
                  to={`/campaigns/campaign-${index + 5}`}
                >
                  Play now
                </Link>
              </div>
            ),
          )}
        </div>
        <button className="load-campaigns">
          Load more campaigns <ArrowRight />
        </button>
      </section>
    </div>
  );
}
