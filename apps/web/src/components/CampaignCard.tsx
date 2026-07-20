import { Clock3, Gamepad2, Globe2, Signal, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge, Card, Sparks, VerifiedBadge } from "@nortix/ui";
import type { DemoCampaign } from "../features/demo-data";

export function CampaignCard({
  campaign,
  featured = false,
}: {
  campaign: DemoCampaign;
  featured?: boolean;
}) {
  return (
    <Card className={`campaign-card ${featured ? "campaign-card--featured" : ""}`}>
      <Link
        to={`/campaigns/${campaign.id}`}
        className={`server-art server-art--${campaign.server.art}`}
      >
        <span className="server-art__edition">{campaign.server.edition}</span>
        <span className="server-art__monogram">
          {campaign.server.name.slice(0, 2).toUpperCase()}
        </span>
        <span className="server-art__live">
          <Signal size={12} /> Live playtest
        </span>
      </Link>
      <div className="campaign-card__body">
        <div className="campaign-card__server">
          <Link to={`/servers/${campaign.server.slug}`}>{campaign.server.name}</Link>
          <VerifiedBadge />
        </div>
        <Link to={`/campaigns/${campaign.id}`} className="campaign-card__title">
          {campaign.title}
        </Link>
        <p>{campaign.description}</p>
        <div className="chip-row">
          <Badge>{campaign.category}</Badge>
          <Badge>{campaign.version}</Badge>
          <Badge tone={campaign.difficulty === "Advanced" ? "warning" : "neutral"}>
            {campaign.difficulty}
          </Badge>
        </div>
        <div className="campaign-card__meta">
          <span>
            <Clock3 size={14} /> {campaign.duration}
          </span>
          <span>
            <Users size={14} /> {campaign.participants} testing
          </span>
          <span>
            <Globe2 size={14} /> {campaign.region}
          </span>
        </div>
        <div className="campaign-card__footer">
          <div>
            <small>Potential campaign reward</small>
            <strong>Up to {campaign.sparks} Sparks</strong>
          </div>
          <Sparks value="Subject to verification" />
          <Link className="button button--secondary button--small" to={`/campaigns/${campaign.id}`}>
            <Gamepad2 size={15} /> View playtest
          </Link>
        </div>
      </div>
    </Card>
  );
}
