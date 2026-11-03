import type { PostHog } from "posthog-js";

import type { Audience } from "./links";
import type { SnippetName } from "./snippets";

export type CtaSection = "nav" | "hero" | "business" | "pricing" | "final";

/** What the landing measures. No property carries personal data: no email, name or identification. */
export type MarketingEvent =
  | { name: "cta_click"; audience: Audience | null; section: CtaSection; plan?: string }
  | { name: "copy_snippet"; snippet: SnippetName }
  | { name: "pricing_view"; page: "landing" | "precios" }
  | { name: "whatsapp_click"; section: CtaSection | "float" }
  | { name: "sign_up"; audience: Audience | null; ref: string | null };

/** The pages PostHog may see; the console behind the sign-in is not measured. */
const measuredPaths = new Set(["/", "/precios", "/sign-up"]);

let client: Promise<PostHog> | undefined;

/**
 * Loads PostHog once, apart from the page's bundle. Cookieless: it sets no cookies and stores nothing in the
 * browser, so it needs no banner (the project must have cookieless mode on). Events go through /ingest.
 */
export function startAnalytics(key: string) {
  client ??= import("posthog-js").then(({ default: posthog }) => {
    posthog.init(key, {
      api_host: "/ingest",
      ui_host: "https://us.posthog.com",
      cookieless_mode: "always",
      person_profiles: "identified_only",
      capture_pageview: "history_change",
      autocapture: false,
      disable_session_recording: true,
      before_send: (event) => (measuredPaths.has(window.location.pathname) ? event : null),
    });
    return posthog;
  });
}

export function track(event: MarketingEvent) {
  const { name, ...properties } = event;
  void client?.then((posthog) => posthog.capture(name, properties));
}
