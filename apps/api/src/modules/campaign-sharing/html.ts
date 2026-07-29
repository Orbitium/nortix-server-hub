const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!,
  );

export const buildCampaignShareHtml = (input: {
  title: string;
  description: string;
  serverName: string;
  shareUrl: string;
  targetUrl: string;
  imageUrl?: string | null;
}) => {
  const title = escapeHtml(`${input.title} – ${input.serverName} Playtest | Nortix`);
  const description = escapeHtml(input.description);
  const shareUrl = escapeHtml(input.shareUrl);
  const targetUrl = escapeHtml(input.targetUrl);
  const image = input.imageUrl
    ? `<meta property="og:image" content="${escapeHtml(input.imageUrl)}"><meta name="twitter:image" content="${escapeHtml(input.imageUrl)}">`
    : "";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${title}</title><meta name="description" content="${description}"><meta property="og:type" content="article"><meta property="og:site_name" content="Nortix"><meta property="og:title" content="${title}"><meta property="og:description" content="${description}"><meta property="og:url" content="${shareUrl}"><meta name="twitter:card" content="${input.imageUrl ? "summary_large_image" : "summary"}"><meta name="twitter:title" content="${title}"><meta name="twitter:description" content="${description}">${image}<link rel="canonical" href="${targetUrl}"><meta http-equiv="refresh" content="0;url=${targetUrl}"></head><body><p>Opening <a href="${targetUrl}">${title}</a>…</p></body></html>`;
};
