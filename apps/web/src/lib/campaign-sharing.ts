type ShareCampaign = {
  id: string;
  title: string;
  maximumSparksReward: number;
  server: { name: string; slug: string };
};

export const campaignSharePath = (campaignId: string) =>
  `/share/campaigns/${encodeURIComponent(campaignId)}`;

export const campaignLandingPath = (campaign: Pick<ShareCampaign, "id" | "server">) =>
  `/servers/${encodeURIComponent(campaign.server.slug)}?campaign=${encodeURIComponent(campaign.id)}`;

export const absoluteCampaignShareUrl = (campaignId: string, origin = window.location.origin) =>
  new URL(campaignSharePath(campaignId), origin).toString();

export const campaignShareText = (
  campaign: Pick<ShareCampaign, "title" | "server" | "maximumSparksReward">,
) =>
  `Help test ${campaign.server.name}: ${campaign.title}. Eligible verified activity may receive up to ${campaign.maximumSparksReward} Sparks.`;

export const campaignSocialLinks = (
  campaign: ShareCampaign,
  origin = window.location.origin,
) => {
  const url = absoluteCampaignShareUrl(campaign.id, origin);
  const text = campaignShareText(campaign);
  return {
    x: `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    reddit: `https://www.reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(campaign.title)}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`,
  };
};
