import { Check, Copy, Share2 } from "lucide-react";
import { useState } from "react";
import type { PublicCampaign } from "../features/api-data";
import {
  absoluteCampaignShareUrl,
  campaignShareText,
  campaignSocialLinks,
} from "../lib/campaign-sharing";
import { Modal } from "./Modal";

export function CampaignShareButton({
  campaign,
}: {
  campaign: PublicCampaign;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const url = absoluteCampaignShareUrl(campaign.id);
  const links = campaignSocialLinks(campaign);

  const copyLink = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const nativeShare = async () => {
    if (!navigator.share) {
      await copyLink();
      return;
    }
    await navigator.share({ title: campaign.title, text: campaignShareText(campaign), url });
  };

  return (
    <>
      <button
        type="button"
        className="button button--secondary"
        onClick={() => setOpen(true)}
      >
        <Share2 /> Share
      </button>
      {open ? (
        <Modal title="Share this campaign" className="campaign-share-modal" onClose={() => setOpen(false)}>
          <div className="modal__body campaign-share-preview">
            <span>PLAYTEST ON {campaign.server.name}</span>
            <h3>{campaign.title}</h3>
            <p>{campaign.description}</p>
            <small>
              {campaign.milestones.length} milestones · Up to {campaign.maximumSparksReward} Sparks
              after verification
            </small>
            <div className="campaign-share-platforms">
              <button type="button" onClick={() => void nativeShare()}><Share2 /> Share…</button>
              <a href={links.x} target="_blank" rel="noreferrer">X</a>
              <a href={links.facebook} target="_blank" rel="noreferrer">Facebook</a>
              <a href={links.reddit} target="_blank" rel="noreferrer">Reddit</a>
              <a href={links.whatsapp} target="_blank" rel="noreferrer">WhatsApp</a>
            </div>
            <button className="button button--primary" type="button" onClick={() => void copyLink()}>
              {copied ? <Check /> : <Copy />} {copied ? "Link copied" : "Copy campaign link"}
            </button>
          </div>
        </Modal>
      ) : null}
    </>
  );
}
