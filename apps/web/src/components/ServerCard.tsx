import { CircleDot, Star, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge, Card, VerifiedBadge } from "@nortix/ui";
import { type PublicServer } from "../features/api-data";
import { useI18n } from "../lib/i18n";

export function ServerCard({ server }: { server: PublicServer }) {
  const { t, formatNumber } = useI18n();
  return (
    <Card className="server-card">
      <Link to={`/servers/${server.slug}`} className="server-card__visual">
        {server.logoUrl ? <img className="server-card__visual-backdrop" src={server.logoUrl} alt="" aria-hidden="true" /> : null}
        {server.logoUrl ? (
          <img className="server-card__visual-icon" src={server.logoUrl} alt={`${server.name} icon`} />
        ) : (
          <span className="server-card__visual-monogram">{server.name.slice(0, 2).toUpperCase()}</span>
        )}
      </Link>
      <div className="server-card__content">
        <div className="server-card__heading">
          <Link to={`/servers/${server.slug}`}>{server.name}</Link>
          {server.source === "DISCOVERED" ? (
            <Badge tone="neutral">Public listing</Badge>
          ) : (
            <VerifiedBadge />
          )}
        </div>
        <p>{server.description}</p>
        <div className="chip-row">
          {server.categories.map((category) => (
            <Badge key={category}>{category}</Badge>
          ))}
          <Badge tone="info">{server.edition}</Badge>
        </div>
        <div className="server-card__stats">
          <span className={server.online ? "online" : "offline"}>
            <CircleDot size={13} /> {server.online ? t("server.online") : t("server.offline")}
          </span>
          <span>
            <Users size={13} /> {formatNumber(server.playerCount ?? 0)}
          </span>
          <span>
            <Star size={13} fill="currentColor" />{" "}
            {server.rating == null ? t("server.new") : server.rating.toFixed(1)}
          </span>
        </div>
      </div>
    </Card>
  );
}
