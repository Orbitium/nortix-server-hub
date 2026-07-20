import { CircleDot, Star, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge, Card, VerifiedBadge } from "@nortix/ui";
import { artIndexFor, type PublicServer } from "../features/api-data";

export function ServerCard({ server }: { server: PublicServer }) {
  return (
    <Card className="server-card">
      <Link
        to={`/servers/${server.slug}`}
        className={`server-art server-art--${artIndexFor(server.id)}`}
      >
        <span className="server-art__monogram">{server.name.slice(0, 2).toUpperCase()}</span>
      </Link>
      <div className="server-card__content">
        <div className="server-card__heading">
          <Link to={`/servers/${server.slug}`}>{server.name}</Link>
          <VerifiedBadge />
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
            <CircleDot size={13} /> {server.online ? "Online" : "Offline"}
          </span>
          <span>
            <Users size={13} /> {(server.playerCount ?? 0).toLocaleString()}
          </span>
          <span>
            <Star size={13} fill="currentColor" />{" "}
            {server.rating == null ? "New" : server.rating.toFixed(1)}
          </span>
        </div>
      </div>
    </Card>
  );
}
