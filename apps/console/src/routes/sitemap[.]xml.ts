import { createFileRoute } from "@tanstack/react-router";

import { legalDocuments } from "~/features/legal/documents";
import { marketingPaths, siteUrl } from "~/features/marketing/seo";

const paths = [...marketingPaths, legalDocuments.terms.path, legalDocuments.privacy.path];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths.map((path) => `  <url><loc>${siteUrl}${path}</loc></url>`).join("\n")}
</urlset>
`;

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: () =>
        new Response(sitemap, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        }),
    },
  },
});
