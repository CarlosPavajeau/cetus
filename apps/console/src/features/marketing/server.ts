import { createServerFn } from "@tanstack/react-start";

import { publicApi } from "~/lib/api/client";
import { env } from "~/lib/env";

import { highlight } from "./highlight";
import { type SnippetName, snippets } from "./snippets";

/** What the marketing pages need from the server's environment; all of it is public. */
export const getMarketingConfig = createServerFn({ method: "GET" }).handler(() => ({
  whatsappNumber: env.CETUS_WHATSAPP_NUMBER ?? null,
}));

/** The listed plans and their prices today, for visitors without a session. */
export const listPublicPlans = createServerFn({ method: "GET" }).handler(() =>
  publicApi.get("/public/plans"),
);

export const highlightSnippets = createServerFn({ method: "GET" }).handler(
  async (): Promise<Record<SnippetName, string>> => ({
    heroCurl: await highlightSnippet("heroCurl"),
    invoiceCurl: await highlightSnippet("invoiceCurl"),
    invoiceJs: await highlightSnippet("invoiceJs"),
    invoicePython: await highlightSnippet("invoicePython"),
    webhookPayload: await highlightSnippet("webhookPayload"),
  }),
);

function highlightSnippet(name: SnippetName) {
  return highlight(snippets[name].code, snippets[name].lang);
}
