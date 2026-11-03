import { createFileRoute } from "@tanstack/react-router";

const posthogHost = "https://us.i.posthog.com";
const posthogAssetsHost = "https://us-assets.i.posthog.com";

/**
 * PostHog through the console's own domain, so content blockers that drop *.posthog.com do not skew the funnel.
 * The visitor's IP goes along for PostHog's geolocation and its cookieless hash; cookies never do.
 */
async function forward({ request, params }: { request: Request; params: { _splat?: string } }) {
  const path = params._splat ?? "";
  const host = path.startsWith("static/") ? posthogAssetsHost : posthogHost;
  const url = new URL(request.url);
  const headers = new Headers();
  for (const name of ["content-type", "content-encoding", "user-agent", "accept"]) {
    const value = request.headers.get(name);
    if (value !== null) {
      headers.set(name, value);
    }
  }
  const ip = request.headers.get("cf-connecting-ip");
  if (ip !== null) {
    headers.set("x-forwarded-for", ip);
  }
  const upstream = await fetch(`${host}/${path}${url.search}`, {
    method: request.method,
    headers,
    body:
      request.method === "GET" || request.method === "HEAD"
        ? undefined
        : await request.arrayBuffer(),
  });
  const responseHeaders = new Headers();
  for (const name of ["content-type", "cache-control"]) {
    const value = upstream.headers.get(name);
    if (value !== null) {
      responseHeaders.set(name, value);
    }
  }
  return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
}

export const Route = createFileRoute("/ingest/$")({
  server: {
    handlers: { GET: forward, POST: forward },
  },
});
