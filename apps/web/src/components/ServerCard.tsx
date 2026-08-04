import { Award, CircleDot, Flame, Megaphone, Signal, Star, ThumbsUp, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge, Card, VerifiedBadge } from "@nortix/ui";
import { type PublicServer } from "../features/api-data";
import { useI18n } from "../lib/i18n";

export function ServerCard({ server }: { server: PublicServer }) {
  const { t, formatNumber } = useI18n();
  const banner = server.bannerUrl ?? server.logoUrl;
  const hypeTotal = server.hype?.total ?? 0;
  const campaigns =
    server.activeCampaignCount ?? server.campaignCountAllTime ?? 0;
  const nortixPlayers = server.nortixPlayerCount ?? 0;
  const joins = server.monthlyJoins ?? 0;
  const retention =
    server.retentionRate == null ? null : Math.round(server.retentionRate * 100);
  const hasActivity = server.source === "NORTIX";
  return (
    <Card className="server-card">
      <Link to={`/servers/${server.slug}`} className="server-card__visual">
        {banner ? (
          <img
            className="server-card__visual-backdrop"
            src={banner}
            alt=""
            aria-hidden="true"
          />
        ) : null}
        <span className={`server-card__live ${server.online ? "online" : ""}`}>
          <CircleDot size={13} /> {server.online ? t("server.online") : t("server.offline")}
        </span>
        {server.logoUrl ? (
          <img
            className="server-card__visual-icon"
            src={server.logoUrl}
            alt={`${server.name} icon`}
          />
        ) : (
          <span className="server-card__visual-monogram">
            {server.name.slice(0, 2).toUpperCase()}
          </span>
        )}
      </Link>
      <div className="server-card__content">
        <div className="server-card__heading">
          <Link to={`/servers/${server.slug}`}>{server.name}</Link>
          {server.verificationStatus === "VERIFIED" ? (
            <VerifiedBadge />
          ) : (
            <Badge tone="neutral">Public listing</Badge>
          )}
        </div>
        <p>{server.description}</p>
        <div className="chip-row">
          {server.categories.slice(0, 3).map((category) => (
            <Badge key={category}>{category}</Badge>
          ))}
          {server.categories.length > 3 ? (
            <Badge tone="neutral">+{server.categories.length - 3}</Badge>
          ) : null}
          <Badge tone="info">{server.edition}</Badge>
        </div>
        <div className="server-card__stats">
          <span title="Online players">
            <Users size={13} /> {formatNumber(server.playerCount ?? 0)}
          </span>
          <span title="Votes">
            <ThumbsUp size={13} /> {formatNumber(server.voteCount ?? 0)}
          </span>
          <span className="server-card__hype" title="Hype">
            <Flame size={13} fill="currentColor" /> {formatNumber(hypeTotal)}
          </span>
          <span title="Campaigns">
            <Megaphone size={13} /> {formatNumber(campaigns)}
          </span>
          {server.rating != null && (
            <span title="Rating">
              <Star size={13} fill="currentColor" /> {server.rating.toFixed(1)}
            </span>
          )}
          {server.awardCount != null && server.awardCount > 0 ? (
            <span className="server-card__awards" title="Awards">
              <Award size={13} /> {formatNumber(server.awardCount)}
            </span>
          ) : null}
        </div>
        {hasActivity && nortixPlayers > 0 ? (
          <div className="server-card__activity">
            <Signal size={13} />
            <span>
              <strong>{formatNumber(nortixPlayers)}</strong> Nortix players
            </span>
            <span>
              <strong>{formatNumber(joins)}</strong> joins
            </span>
            {retention != null ? (
              <span>
                <strong>{retention}%</strong> retained
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </Card>
  );
}
