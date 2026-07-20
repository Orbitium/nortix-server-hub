import { ArrowRight, BadgeCheck, Compass, Gamepad2, Search, Sparkles, Users } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { artIndexFor, usePublicCampaigns } from "../features/api-data";
import { useI18n } from "../lib/i18n";

export function ReferenceDashboardHome() {
  const { t, formatNumber } = useI18n();
  const { data, isLoading, isError, refetch } = usePublicCampaigns();
  const campaigns = data?.items ?? [];
  const categories = ["__all__", ...new Set(campaigns.map((item) => item.category))];
  const versions = ["__all__", ...new Set(campaigns.flatMap((item) => item.versionRequirements))];
  const sorts = ["recommended", "sparks", "active"] as const;
  const [categoryFilter, setCategoryFilter] = useState("__all__");
  const [versionFilter, setVersionFilter] = useState("__all__");
  const [sort, setSort] = useState<(typeof sorts)[number]>("recommended");
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(4);
  const matchingCampaigns = campaigns
    .filter(
      (campaign) =>
        (categoryFilter === "__all__" || campaign.category === categoryFilter) &&
        (versionFilter === "__all__" || campaign.versionRequirements.includes(versionFilter)) &&
        `${campaign.title} ${campaign.description} ${campaign.category} ${campaign.server.name}`
          .toLowerCase()
          .includes(search.trim().toLowerCase()),
    )
    .sort((left, right) => {
      if (sort === "sparks") {
        return right.maximumSparksReward - left.maximumSparksReward;
      }
      if (sort === "active") {
        return right._count.participations - left._count.participations;
      }
      return 0;
    });

  const cycleValue = (values: readonly string[], current: string) =>
    values[(values.indexOf(current) + 1) % values.length]!;

  return (
    <div className="dashboard-page dashboard-home">
      <section className="home-hero">
        <div className="home-hero__media" aria-label={t("home.artPlaceholder")} />
        <div className="home-hero__copy">
          <span>{t("home.eyebrow")}</span>
          <h1>{t("home.title")}</h1>
          <p>{t("home.description")}</p>
          <div>
            <Link className="button button--primary" to="/campaigns">
              <Gamepad2 /> {t("home.browse")}
            </Link>
            <Link className="button button--glass" to="/how-it-works">
              <Compass /> {t("nav.howItWorks")}
            </Link>
          </div>
        </div>
      </section>

      <section className="home-section">
        <div className="home-section__heading">
          <div>
            <h2>
              <Sparkles /> {t("home.featured")}
            </h2>
            <p>{t("home.seeded")}</p>
          </div>
          <Link to="/campaigns">
            {t("home.viewAll")} <ArrowRight />
          </Link>
        </div>
        <div className="featured-campaigns">
          {campaigns.slice(0, 4).map((campaign, index) => (
            <Link className="featured-tile" to={`/campaigns/${campaign.id}`} key={campaign.id}>
              <div className={`featured-tile__art server-art--${artIndexFor(campaign.server.id)}`}>
                <span className={`featured-label featured-label--${index}`}>
                  {index === 0 ? t("home.featuredLabel") : campaign.status}
                </span>
                <b>{campaign.server.name}</b>
              </div>
              <div className="featured-tile__body">
                <h3>
                  {campaign.title} <BadgeCheck />
                </h3>
                <div className="featured-tile__tags">
                  <span>{campaign.category}</span>
                  <span>{campaign.versionRequirements[0] ?? t("home.anyVersion")}</span>
                  <span>{t("home.steps", { count: campaign.milestones.length })}</span>
                </div>
                <div className="featured-tile__meta">
                  <strong>
                    {t("home.upToSparks", { count: formatNumber(campaign.maximumSparksReward) })}
                  </strong>
                  <span>
                    <Users /> {campaign._count.participations}
                  </span>
                </div>
              </div>
            </Link>
          ))}
          {isLoading ? <p>{t("home.loading")}</p> : null}
          {isError ? <button onClick={() => refetch()}>{t("home.retry")}</button> : null}
        </div>
      </section>

      <section className="home-section campaign-directory">
        <div className="home-section__heading campaign-directory__heading">
          <h2>
            <Gamepad2 /> {t("home.allCampaigns")}
          </h2>
          <div className="campaign-filters">
            <button
              type="button"
              title={t("home.changeCategory")}
              onClick={() => {
                setCategoryFilter(cycleValue(categories, categoryFilter));
                setVisibleCount(4);
              }}
            >
              {categoryFilter === "__all__" ? t("home.allCategories") : categoryFilter}
            </button>
            <button
              type="button"
              title={t("home.changeVersion")}
              onClick={() => {
                setVersionFilter(cycleValue(versions, versionFilter));
                setVisibleCount(4);
              }}
            >
              {versionFilter === "__all__" ? t("home.allVersions") : versionFilter}
            </button>
            <button
              type="button"
              title={t("home.changeSorting")}
              onClick={() => setSort(cycleValue(sorts, sort) as (typeof sorts)[number])}
            >
              {t("home.sort", {
                value:
                  sort === "recommended"
                    ? t("home.recommended")
                    : sort === "sparks"
                      ? t("home.highestSparks")
                      : t("home.mostActive"),
              })}
            </button>
            <label>
              <Search />
              <input
                aria-label={t("home.search")}
                placeholder={t("home.search")}
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
                <span>{t("home.steps", { count: campaign.milestones.length })}</span>
              </div>
              <strong>
                {t("home.upToSparks", { count: formatNumber(campaign.maximumSparksReward) })}
              </strong>
              <span className="campaign-row__players">
                <Users /> {campaign._count.participations}
              </span>
              <Link
                className="button button--primary button--small"
                to={`/campaigns/${campaign.id}`}
              >
                {t("home.playNow")}
              </Link>
            </div>
          ))}
          {!isLoading && !isError && matchingCampaigns.length === 0 ? (
            <p className="campaign-list__empty">{t("home.noCampaigns")}</p>
          ) : null}
        </div>
        <button
          type="button"
          className="load-campaigns"
          disabled={visibleCount >= matchingCampaigns.length}
          onClick={() => setVisibleCount((current) => current + 4)}
        >
          {visibleCount >= matchingCampaigns.length ? t("home.loaded") : t("home.loadMore")}{" "}
          <ArrowRight />
        </button>
      </section>
    </div>
  );
}
