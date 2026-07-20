import { ArrowRight, BadgeCheck, Compass, Gamepad2, Search, Sparkles, Users } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { artIndexFor, usePublicCampaigns } from "../features/api-data";

export function ReferenceDashboardHome() {
  const { data, isLoading, isError, refetch } = usePublicCampaigns();
  const campaigns = data?.items ?? [];
  const categories = ["All categories", ...new Set(campaigns.map((item) => item.category))];
  const versions = [
    "All versions",
    ...new Set(campaigns.flatMap((item) => item.versionRequirements)),
  ];
  const sorts = ["Recommended", "Highest Sparks", "Most active"] as const;
  const [categoryFilter, setCategoryFilter] = useState("All categories");
  const [versionFilter, setVersionFilter] = useState("All versions");
  const [sort, setSort] = useState<(typeof sorts)[number]>("Recommended");
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(4);
  const matchingCampaigns = campaigns
    .filter(
      (campaign) =>
        (categoryFilter === "All categories" || campaign.category === categoryFilter) &&
        (versionFilter === "All versions" ||
          campaign.versionRequirements.includes(versionFilter)) &&
        `${campaign.title} ${campaign.description} ${campaign.category} ${campaign.server.name}`
          .toLowerCase()
          .includes(search.trim().toLowerCase()),
    )
    .sort((left, right) => {
      if (sort === "Highest Sparks") {
        return right.maximumSparksReward - left.maximumSparksReward;
      }
      if (sort === "Most active") {
        return right._count.participations - left._count.participations;
      }
      return 0;
    });

  const cycleValue = (values: readonly string[], current: string) =>
    values[(values.indexOf(current) + 1) % values.length]!;

  return (
    <div className="dashboard-page dashboard-home">
      <section className="home-hero">
        <div className="home-hero__media" aria-label="Campaign artwork placeholder" />
        <div className="home-hero__copy">
          <span>PLAY. TEST. CONTRIBUTE.</span>
          <h1>Make every session count.</h1>
          <p>Help ambitious Minecraft servers grow. Verified activity may receive Sparks.</p>
          <div>
            <Link className="button button--primary" to="/campaigns">
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
            <p>Active campaigns loaded from Nortix seed data.</p>
          </div>
          <Link to="/campaigns">
            View all <ArrowRight />
          </Link>
        </div>
        <div className="featured-campaigns">
          {campaigns.slice(0, 4).map((campaign, index) => (
            <Link className="featured-tile" to={`/campaigns/${campaign.id}`} key={campaign.id}>
              <div className={`featured-tile__art server-art--${artIndexFor(campaign.server.id)}`}>
                <span className={`featured-label featured-label--${index}`}>
                  {index === 0 ? "FEATURED" : campaign.status}
                </span>
                <b>{campaign.server.name}</b>
              </div>
              <div className="featured-tile__body">
                <h3>
                  {campaign.title} <BadgeCheck />
                </h3>
                <div className="featured-tile__tags">
                  <span>{campaign.category}</span>
                  <span>{campaign.versionRequirements[0] ?? "Any version"}</span>
                  <span>{campaign.milestones.length} steps</span>
                </div>
                <div className="featured-tile__meta">
                  <strong>Up to {campaign.maximumSparksReward} Sparks</strong>
                  <span>
                    <Users /> {campaign._count.participations}
                  </span>
                </div>
              </div>
            </Link>
          ))}
          {isLoading ? <p>Loading seeded campaigns…</p> : null}
          {isError ? <button onClick={() => refetch()}>Retry seeded campaigns</button> : null}
        </div>
      </section>

      <section className="home-section campaign-directory">
        <div className="home-section__heading campaign-directory__heading">
          <h2>
            <Gamepad2 /> All campaigns
          </h2>
          <div className="campaign-filters">
            <button
              type="button"
              title="Change category"
              onClick={() => {
                setCategoryFilter(cycleValue(categories, categoryFilter));
                setVisibleCount(4);
              }}
            >
              {categoryFilter}
            </button>
            <button
              type="button"
              title="Change version"
              onClick={() => {
                setVersionFilter(cycleValue(versions, versionFilter));
                setVisibleCount(4);
              }}
            >
              {versionFilter}
            </button>
            <button
              type="button"
              title="Change sorting"
              onClick={() => setSort(cycleValue(sorts, sort) as (typeof sorts)[number])}
            >
              Sort: {sort}
            </button>
            <label>
              <Search />
              <input
                aria-label="Search campaigns"
                placeholder="Search campaigns..."
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setVisibleCount(4);
                }}
              />
            </label>
          </div>
        </div>

        <div className="campaign-list">
          {matchingCampaigns.slice(0, visibleCount).map((campaign) => (
            <div className="campaign-row" key={campaign.id}>
              <div
                className={`campaign-row__art server-art--${artIndexFor(campaign.server.id)}`}
                aria-hidden="true"
              >
                {campaign.server.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="campaign-row__copy">
                <h3>
                  {campaign.title} <BadgeCheck />
                </h3>
                <p>{campaign.description}</p>
              </div>
              <div className="campaign-row__tags">
                <span>{campaign.category}</span>
                <span>{campaign.versionRequirements[0] ?? "Any"}</span>
                <span>{campaign.milestones.length} steps</span>
              </div>
              <strong>Up to {campaign.maximumSparksReward} Sparks</strong>
              <span className="campaign-row__players">
                <Users /> {campaign._count.participations}
              </span>
              <Link
                className="button button--primary button--small"
                to={`/campaigns/${campaign.id}`}
              >
                Play now
              </Link>
            </div>
          ))}
          {!isLoading && !isError && matchingCampaigns.length === 0 ? (
            <p className="campaign-list__empty">No campaigns match these filters.</p>
          ) : null}
        </div>
        <button
          type="button"
          className="load-campaigns"
          disabled={visibleCount >= matchingCampaigns.length}
          onClick={() => setVisibleCount((current) => current + 4)}
        >
          {visibleCount >= matchingCampaigns.length ? "All campaigns loaded" : "Load more campaigns"}{" "}
          <ArrowRight />
        </button>
      </section>
    </div>
  );
}
