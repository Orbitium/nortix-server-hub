import { CalendarClock, Gamepad2, Globe2, Signal, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge, Card, Sparks, VerifiedBadge } from "@nortix/ui";
import { artIndexFor, type PublicCampaign } from "../features/api-data";

export function CampaignCard({
  campaign,
  featured = false,
}: {
  campaign: PublicCampaign;
  featured?: boolean;
}) {
  const version =
    campaign.versionRequirements[0] ?? campaign.server.versions[0] ?? "Any version";
  const region = campaign.regionRestrictions.length
    ? campaign.regionRestrictions.join(" · ")
    : "Worldwide";
  return (
    <Card className={`campaign-card ${featured ? "campaign-card--featured" : ""}`}>
      <Link
        to={`/campaigns/${campaign.id}`}
        className={`server-art server-art--${artIndexFor(campaign.server.id)}`}
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
          <Badge>{version}</Badge>
          <Badge>{campaign.milestones.length} milestones</Badge>
        </div>
        <div className="campaign-card__meta">
          <span>
            <CalendarClock size={14} /> Ends {new Date(campaign.endsAt).toLocaleDateString()}
          </span>
          <span>
            <Users size={14} /> {campaign._count.participations} testing
          </span>
          <span>
            <Globe2 size={14} /> {region}
          </span>
        </div>
        <div className="campaign-card__footer">
          <div>
            <small>Potential campaign reward</small>
            <strong>
              {campaign.minimumSparksReward}–{campaign.maximumSparksReward} Sparks
            </strong>
          </div>
          <Sparks
            value={
              campaign.automaticVerification
                ? "Automatic verification"
                : "Subject to verification"
            }
          />
          <Link className="button button--secondary button--small" to={`/campaigns/${campaign.id}`}>
            <Gamepad2 size={15} /> View playtest
          </Link>
        </div>
      </div>
    </Card>
  );
}
