import { createFileRoute } from "@tanstack/react-router";

import { siteUrl } from "~/features/marketing/seo";

const robots = `User-agent: *
Allow: /$
Allow: /precios
Allow: /legal/
Disallow: /

Sitemap: ${siteUrl}/sitemap.xml
`;

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: () =>
        new Response(robots, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        }),
    },
  },
});
