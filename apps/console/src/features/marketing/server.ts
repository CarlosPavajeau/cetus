import { createServerFn } from "@tanstack/react-start";
import { type } from "arktype";

import { legalDocuments } from "~/features/legal/documents";
import { CetusApiError, publicApi } from "~/lib/api/client";
import { env } from "~/lib/env";

import { highlight } from "./highlight";
import { type LeadResult, leadEmail, leadTrap } from "./leads";
import { type SnippetName, snippets } from "./snippets";

/** What the marketing pages need from the server's environment; all of it is public. */
export const getMarketingConfig = createServerFn({ method: "GET" }).handler(() => ({
  whatsappNumber: env.CETUS_WHATSAPP_NUMBER ?? null,
  posthogKey: env.CETUS_POSTHOG_KEY ?? null,
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
    webhookVerify: await highlightSnippet("webhookVerify"),
  }),
);

function highlightSnippet(name: SnippetName) {
  return highlight(snippets[name].code, snippets[name].lang);
}

/** The trust band's figures and the calculator's cap; counted across every account, so the API caches them. */
export const getLandingFigures = createServerFn({ method: "GET" }).handler(() =>
  publicApi.get("/console/public/landing"),
);

const answer = type("'YES' | 'NO' | 'UNKNOWN'");

const calculatorLeadInput = type({
  email: leadEmail,
  website: leadTrap,
  answers: type({ personType: "'LEGAL_ENTITY'" }).or({
    personType: "'NATURAL_PERSON'",
    simpleRegime: answer,
    incomeOverCap: answer,
    severalEstablishments: answer,
    otherConditions: answer,
  }),
});

/** Emails the calculator's result to the visitor, who authorized it under the current privacy policy. */
export const sendCalculatorLead = createServerFn({ method: "POST" })
  .validator(calculatorLeadInput)
  .handler(({ data }) =>
    submitLead(data.website, () =>
      publicApi.post("/console/public/leads/calculator", {
        body: {
          email: data.email,
          policyVersion: legalDocuments.privacy.version,
          answers: data.answers,
        },
      }),
    ),
  );

/** "Avísame": the address goes on the email provider's list for that integration. */
export const sendIntegrationLead = createServerFn({ method: "POST" })
  .validator(
    type({
      email: leadEmail,
      website: leadTrap,
      integration: "'WOOCOMMERCE' | 'SHOPIFY' | 'AUTOMATIONS' | 'PAYMENTS'",
    }),
  )
  .handler(({ data }) =>
    submitLead(data.website, () =>
      publicApi.post("/console/public/leads/integrations", {
        body: {
          email: data.email,
          policyVersion: legalDocuments.privacy.version,
          integration: data.integration,
        },
      }),
    ),
  );

/** The partner form as the browser parsed it; the API checks the lengths again. */
const partnerLeadInput = type({
  email: "string",
  website: leadTrap,
  name: "string",
  company: "string",
  phone: "string",
  companies: "1 <= number.integer <= 10000",
  message: "string",
});

/** The partner form, for the support mailbox to answer. */
export const sendPartnerLead = createServerFn({ method: "POST" })
  .validator(partnerLeadInput)
  .handler(({ data }) =>
    submitLead(data.website, () =>
      publicApi.post("/console/public/leads/partners", {
        body: {
          email: data.email,
          policyVersion: legalDocuments.privacy.version,
          name: data.name,
          company: data.company || undefined,
          phone: data.phone || undefined,
          companies: data.companies,
          message: data.message || undefined,
        },
      }),
    ),
  );

/**
 * A filled trap means a bot: it gets the same success as a person and nothing reaches the API. The API's quota is
 * the one answer a person can act on.
 */
async function submitLead(trap: string, send: () => Promise<unknown>): Promise<LeadResult> {
  if (trap !== "") {
    return { ok: true };
  }
  try {
    await send();
    return { ok: true };
  } catch (error) {
    if (error instanceof CetusApiError && error.status === 429) {
      return {
        ok: false,
        message:
          "Recibimos varias solicitudes desde tu conexión o con este correo. Inténtalo de nuevo en un rato.",
      };
    }
    if (error instanceof CetusApiError && error.status === 400) {
      return { ok: false, message: "Revisa el correo: no parece una dirección válida." };
    }
    throw error;
  }
}
