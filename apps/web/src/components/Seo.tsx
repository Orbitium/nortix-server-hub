import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const SITE_ORIGIN = "https://hub.nortixlabs.com";
const SITE_NAME = "Nortix";
const DEFAULT_IMAGE = `${SITE_ORIGIN}/og-nortix.png`;

type JsonLd = Record<string, unknown> | Array<Record<string, unknown>>;

type SeoProps = {
  title: string;
  description: string;
  path?: string;
  image?: string | null;
  noIndex?: boolean;
  type?: "website" | "article";
  jsonLd?: JsonLd;
};

const upsertMeta = (selector: string, attribute: "name" | "property", key: string, content: string) => {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.content = content;
};

const upsertLink = (rel: string, href: string) => {
  let element = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!element) {
    element = document.createElement("link");
    element.rel = rel;
    document.head.appendChild(element);
  }
  element.href = href;
};

export function Seo({
  title,
  description,
  path = "/",
  image = DEFAULT_IMAGE,
  noIndex = false,
  type = "website",
  jsonLd,
}: SeoProps) {
  useEffect(() => {
    const fullTitle = title.includes("Nortix") ? title : `${title} | Nortix`;
    const canonical = new URL(path, SITE_ORIGIN).toString();

    document.title = fullTitle;
    upsertMeta('meta[name="description"]', "name", "description", description);
    upsertMeta(
      'meta[name="robots"]',
      "name",
      "robots",
      noIndex
        ? "noindex, nofollow, noarchive"
        : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
    );
    upsertMeta('meta[name="googlebot"]', "name", "googlebot", noIndex ? "noindex, nofollow" : "index, follow");
    upsertMeta('meta[property="og:site_name"]', "property", "og:site_name", SITE_NAME);
    upsertMeta('meta[property="og:locale"]', "property", "og:locale", "en_US");
    upsertMeta('meta[property="og:type"]', "property", "og:type", type);
    upsertMeta('meta[property="og:title"]', "property", "og:title", fullTitle);
    upsertMeta('meta[property="og:description"]', "property", "og:description", description);
    upsertMeta('meta[property="og:url"]', "property", "og:url", canonical);
    upsertMeta('meta[name="twitter:card"]', "name", "twitter:card", image ? "summary_large_image" : "summary");
    upsertMeta('meta[name="twitter:title"]', "name", "twitter:title", fullTitle);
    upsertMeta('meta[name="twitter:description"]', "name", "twitter:description", description);

    if (image) {
      const absoluteImage = new URL(image, SITE_ORIGIN).toString();
      upsertMeta('meta[property="og:image"]', "property", "og:image", absoluteImage);
      upsertMeta('meta[property="og:image:alt"]', "property", "og:image:alt", "Nortix Minecraft server discovery");
      upsertMeta('meta[name="twitter:image"]', "name", "twitter:image", absoluteImage);
      upsertMeta('meta[name="twitter:image:alt"]', "name", "twitter:image:alt", "Nortix Minecraft server discovery");
    } else {
      document.head.querySelector('meta[property="og:image"]')?.remove();
      document.head.querySelector('meta[property="og:image:alt"]')?.remove();
      document.head.querySelector('meta[name="twitter:image"]')?.remove();
      document.head.querySelector('meta[name="twitter:image:alt"]')?.remove();
    }

    upsertLink("canonical", canonical);

    const scriptId = "nortix-route-structured-data";
    document.getElementById(scriptId)?.remove();
    if (jsonLd && !noIndex) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.type = "application/ld+json";
      script.textContent = JSON.stringify(jsonLd);
      document.head.appendChild(script);
    }
  }, [description, image, jsonLd, noIndex, path, title, type]);

  return null;
}

const routeMetadata: Record<string, Omit<SeoProps, "path">> = {
  "/servers": {
    title: "Best Minecraft Servers for Java and Bedrock",
    description:
      "Discover verified Minecraft servers across Java and Bedrock. Search Skyblock, Survival, PvP, Lifesteal, Prison, RPG, and other communities.",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Minecraft server discovery",
      description: "A searchable directory of verified Minecraft Java and Bedrock servers.",
      url: `${SITE_ORIGIN}/servers`,
      isPartOf: { "@id": `${SITE_ORIGIN}/#website` },
    },
  },
  "/campaigns": {
    title: "Minecraft Server Playtesting Campaigns",
    description:
      "Explore moderated Minecraft server playtests with clear milestones. Eligible, verified activity may receive up to the published Sparks limit.",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Minecraft server playtesting campaigns",
      description: "Moderated Minecraft playtests with clear, verification-dependent milestones.",
      url: `${SITE_ORIGIN}/campaigns`,
      isPartOf: { "@id": `${SITE_ORIGIN}/#website` },
    },
  },
  "/how-it-works": {
    title: "How Nortix Works for Minecraft Players",
    description:
      "Learn how players discover Minecraft servers, join optional playtests, complete verified milestones, share useful feedback, and may receive Sparks.",
  },
  "/for-server-owners": {
    title: "Minecraft Server Analytics and Playtesting for Owners",
    description:
      "Nortix helps Minecraft server owners recruit testers, create measurable campaigns, understand onboarding funnels, and improve player retention.",
  },
  "/safety": {
    title: "Trust and Safety for Minecraft Playtesting",
    description:
      "Learn how Nortix reviews campaigns, verifies eligible activity, protects player privacy, handles reports, and moderates Minecraft server listings.",
  },
  "/guidelines": {
    title: "Nortix Community Guidelines",
    description:
      "Read the standards for useful feedback, honest campaign participation, accurate Minecraft server listings, and respectful community conduct.",
  },
  "/terms": {
    title: "Nortix Terms",
    description: "Read the terms governing Nortix accounts, Minecraft server listings, campaigns, participation, and Sparks.",
  },
  "/privacy": {
    title: "Nortix Privacy",
    description:
      "Learn what account, campaign, moderation, and Minecraft integration data Nortix uses and how administrative access is restricted.",
  },
  "/contact": {
    title: "Contact Nortix",
    description:
      "Contact Nortix about Minecraft server ownership, campaigns, partnerships, account support, or trust and safety.",
  },
};

const isPrivateRoute = (path: string) =>
  path === "/" ||
  path.startsWith("/dashboard") ||
  path.startsWith("/owner") ||
  path.startsWith("/admin") ||
  path === "/sign-in" ||
  path === "/register";

export function RouteSeo() {
  const { pathname } = useLocation();

  if (/^\/servers\/[^/]+$/.test(pathname) || /^\/campaigns\/[^/]+$/.test(pathname)) {
    return null;
  }

  const metadata = routeMetadata[pathname];
  if (metadata) return <Seo {...metadata} path={pathname} />;

  if (isPrivateRoute(pathname)) {
    return (
      <Seo
        title="Nortix Account"
        description="Private Nortix account workspace."
        path={pathname}
        noIndex
        image={null}
      />
    );
  }

  return (
    <Seo
      title="Page not found"
      description="This Nortix page could not be found."
      path={pathname}
      noIndex
      image={null}
    />
  );
}
