export const siteUrl = "https://cetus.cantte.com";

/** Shared across the marketing pages: Spanish for Colombia, an Open Graph card and the canonical URL. */
export function marketingHead({
  path,
  title,
  description,
}: {
  path: string;
  title: string;
  description: string;
}) {
  const url = `${siteUrl}${path}`;
  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "es_CO" },
      { property: "og:site_name", content: "Cetus" },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: url },
      { property: "og:image", content: `${siteUrl}/og.png` },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: url }],
  };
}

/** Cached at the edge for a few minutes: the HTML is the same with or without a session. */
export const marketingCacheControl = "public, max-age=0, s-maxage=300, stale-while-revalidate=600";

export const marketingPaths = ["/", "/precios"] as const;
