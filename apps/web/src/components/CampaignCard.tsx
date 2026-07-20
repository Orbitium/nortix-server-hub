import { CalendarClock, Gamepad2, Globe2, Signal, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge, Card, Sparks, VerifiedBadge } from "@nortix/ui";
import { artIndexFor, type PublicCampaign } from "../features/api-data";
import { useI18n } from "../lib/i18n";

export function CampaignCard({
  campaign,
  featured = false,
}: {
  campaign: PublicCampaign;
  featured?: boolean;
}) {
  const { t, formatDate, formatNumber } = useI18n();
  const version =
    campaign.versionRequirements[0] ?? campaign.server.versions[0] ?? t("home.anyVersion");
  const region = campaign.regionRestrictions.length
    ? campaign.regionRestrictions.join(" · ")
    : t("campaign.worldwide");
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
          <Signal size={12} /> {t("campaign.live")}
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
          <Badge>{t("campaign.milestones", { count: campaign.milestones.length })}</Badge>
        </div>
        <div className="campaign-card__meta">
          <span>
            <CalendarClock size={14} /> {t("campaign.ends", { date: formatDate(campaign.endsAt) })}
          </span>
          <span>
            <Users size={14} />{" "}
            {t("campaign.testing", { count: formatNumber(campaign._count.participations) })}
          </span>
          <span>
            <Globe2 size={14} /> {region}
          </span>
        </div>
        <div className="campaign-card__footer">
          <div>
            <small>{t("campaign.reward")}</small>
            <strong>
              {campaign.minimumSparksReward}–{campaign.maximumSparksReward} Sparks
            </strong>
          </div>
          <Sparks
            value={campaign.automaticVerification ? t("campaign.automatic") : t("campaign.subject")}
          />
          <Link className="button button--secondary button--small" to={`/campaigns/${campaign.id}`}>
            <Gamepad2 size={15} /> {t("campaign.view")}
          </Link>
        </div>
      </div>
    </Card>
  );
}
