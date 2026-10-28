// What one user does per iteration, for each surface. The scenarios combine these with a load profile.
import { check, sleep } from "k6";
import execution from "k6/execution";
import http from "k6/http";
import { Counter, Rate, Trend } from "k6/metrics";

import {
  apiUrl,
  consoleUrl,
  cookieHeader,
  organizationIndex,
  organizationOf,
  organizations,
  pick,
  weighted,
} from "./common.js";

// --- Public API (/v1), as an integrator's ERP ------------------------------------------------------------------------

function invoiceBody(issuerId) {
  return JSON.stringify({
    issuerId,
    customer: {
      personType: "NATURAL_PERSON",
      identificationType: "CITIZEN_ID",
      identificationNumber: "1020304050",
      legalName: `Cliente ${Math.floor(Math.random() * 500)}`,
    },
    payment: { method: "CASH", meansCode: "10" },
    lines: Array.from({ length: Number(__ENV.LINES || 2) }, (_, index) =>
      index % 2 === 0
        ? {
            itemCode: "SERV-1",
            description: "Servicio de consultoría",
            quantity: 1,
            unitPrice: 100000,
            taxes: [{ type: "IVA", percent: 19 }],
          }
        : {
            itemCode: "PROD-7",
            description: "Licencia mensual",
            quantity: 3,
            unitPrice: 45000,
            taxes: [{ type: "IVA", percent: 19 }],
          },
    ),
  });
}

function apiHeaders(organization, extra = {}) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${organization.apiKey}`,
    ...extra,
  };
}

/** POST /v1/invoices; returns the new document's id, or null when it was not accepted for processing. */
export function issueInvoice(organization = organizationOf()) {
  const response = http.post(`${apiUrl}/v1/invoices`, invoiceBody(organization.issuerId), {
    headers: apiHeaders(organization, { "Idempotency-Key": crypto.randomUUID() }),
    tags: { name: "POST /v1/invoices" },
  });
  const ok = check(response, { "invoice 202": (r) => r.status === 202 });
  return ok ? response.json("id") : null;
}

export function getInvoice(id, organization = organizationOf()) {
  return http.get(`${apiUrl}/v1/invoices/${id}`, {
    headers: apiHeaders(organization),
    tags: { name: "GET /v1/invoices/{id}" },
  });
}

// Ids this VU issued, so reads hit fresh documents as an ERP polling for its results would.
const issued = [];

/** An integrator's mix: one invoice for every three status reads, plus the odd issuer lookup. */
export function publicApi() {
  const organization = organizationOf();
  const action = weighted({ issue: 25, read: 70, issuers: 5 });
  if (action === "issue") {
    const id = issueInvoice(organization);
    if (id) {
      issued.push(id);
      if (issued.length > 200) {
        issued.shift();
      }
    }
  } else if (action === "read") {
    const id = issued.length > 0 ? pick(issued) : pick(organization.documentIds);
    check(getInvoice(id, organization), { "invoice 200": (r) => r.status === 200 });
  } else {
    const response = http.get(`${apiUrl}/v1/issuers`, {
      headers: apiHeaders(organization),
      tags: { name: "GET /v1/issuers" },
    });
    check(response, { "issuers 200": (r) => r.status === 200 });
  }
}

// --- End to end: from POST to the DIAN's answer -----------------------------------------------------------------------

const timeToDelivery = new Trend("time_to_delivery", true);
const delivered = new Rate("delivery_completed");
const artifactsReady = new Rate("artifacts_ready");
const timeToFinal = new Trend("time_to_final_status", true);
// From createdAt to dian.validatedAt as the API reports them: the queue plus the processing, without the
// rounding of the polling interval.
const serverProcessing = new Trend("server_time_to_validation", true);
const finalStatus = new Counter("final_status");
// One sample per invoice: true only when the DIAN accepted it.
const accepted = new Rate("accepted");
const final = new Set(["ACCEPTED", "REJECTED", "FAILED"]);

/**
 * Issues one invoice and polls it (every POLL_SECONDS, 1 by default) until the worker leaves it in a final
 * status or END_TO_END_TIMEOUT seconds (180) pass. time_to_final_status is what an integrator waits.
 */
export function endToEnd() {
  const issuerCount = Number(__ENV.ISSUERS || organizations.length);
  if (!Number.isInteger(issuerCount) || issuerCount < 1 || issuerCount > organizations.length) {
    throw new Error("ISSUERS must be between 1 and the number of seeded organizations");
  }
  const organization = organizations[execution.scenario.iterationInTest % issuerCount];
  const started = Date.now();
  const id = issueInvoice(organization);
  if (!id) {
    finalStatus.add(1, { status: "NOT_RECEIVED" });
    accepted.add(false);
    if (__ENV.WAIT_DELIVERY === "1") {
      delivered.add(false);
      artifactsReady.add(false);
    }
    return;
  }
  const pollSeconds = Number(__ENV.POLL_SECONDS || 1);
  const deadline = started + Number(__ENV.END_TO_END_TIMEOUT || 180) * 1000;
  while (Date.now() < deadline) {
    sleep(pollSeconds);
    const response = getInvoice(id, organization);
    const status = response.status === 200 ? response.json("status") : null;
    if (final.has(status)) {
      timeToFinal.add(Date.now() - started);
      const validatedAt = response.json("dian.validatedAt");
      if (validatedAt) {
        serverProcessing.add(Date.parse(validatedAt) - Date.parse(response.json("createdAt")));
      }
      finalStatus.add(1, { status });
      accepted.add(status === "ACCEPTED");
      if (status === "ACCEPTED" && __ENV.WAIT_DELIVERY === "1") {
        waitDelivery(id, organization, started, deadline, response);
      } else if (__ENV.WAIT_DELIVERY === "1") {
        delivered.add(false);
        artifactsReady.add(false);
      }
      return;
    }
  }
  if (__ENV.WAIT_DELIVERY === "1") {
    delivered.add(false);
    artifactsReady.add(false);
  }
  finalStatus.add(1, { status: "TIMED_OUT" });
  accepted.add(false);
}

function waitDelivery(id, organization, started, deadline, initial) {
  let response = initial;
  while (Date.now() < deadline) {
    const deliveries = response.status === 200 ? response.json("deliveries") : [];
    const resolved = deliveries?.find((delivery) =>
      ["SKIPPED", "SENT", "FAILED", "BOUNCED", "COMPLAINED", "DELIVERED"].includes(delivery.status),
    );
    if (resolved) {
      timeToDelivery.add(Date.now() - started);
      delivered.add(
        __ENV.REQUIRE_SKIPPED !== "0"
          ? resolved.status === "SKIPPED"
          : ["SKIPPED", "SENT", "DELIVERED"].includes(resolved.status),
      );
      const files = ["pdf", "attached-document"].map((kind) =>
        http.get(`${apiUrl}/v1/invoices/${id}/files/${kind}`, {
          headers: apiHeaders(organization),
          tags: { name: "GET /v1/invoices/{id}/files/{file}" },
        }),
      );
      artifactsReady.add(files.every((file) => file.status === 200));
      return;
    }
    sleep(Number(__ENV.POLL_SECONDS || 1));
    response = getInvoice(id, organization);
  }
  delivered.add(false);
  artifactsReady.add(false);
}

// --- Console: the Java API behind the BFF (/console) ------------------------------------------------------------------

// The console mints 5-minute JWTs in-process for its own server; k6 has to ask /api/auth/token over HTTP, which
// Better Auth rate limits per IP (about 10/s). So setup() mints one per organization for every VU to start
// with, and each VU renews its own at a random moment of the token's life, keeping the renewals under that
// limit. A 429 keeps the current token (it is still valid) and retries a few seconds later.
function mintToken(organization) {
  return http.get(`${consoleUrl}/api/auth/token`, {
    headers: { Cookie: cookieHeader(organization), Origin: consoleUrl },
    tags: { name: "GET /api/auth/token" },
    responseCallback: http.expectedStatuses(200, 429),
  });
}

/** Exported by the scenarios that call /console: one fresh token per organization. */
export function setup() {
  const tokens = organizations.map((organization) => {
    const response = mintToken(organization);
    if (response.status !== 200) {
      throw new Error(`/api/auth/token answered ${response.status}: ${response.body}`);
    }
    return response.json("token");
  });
  return { tokens, mintedAt: Date.now() };
}

let token = null;
let renewAt = 0;

function consoleToken(organization, data) {
  if (token === null) {
    token = data.tokens[organizationIndex()];
    renewAt = data.mintedAt + (60 + Math.random() * 180) * 1000;
  }
  if (Date.now() >= renewAt) {
    const response = mintToken(organization);
    if (response.status === 200) {
      token = response.json("token");
      renewAt = Date.now() + (180 + Math.random() * 60) * 1000;
    } else {
      renewAt = Date.now() + (5 + Math.random() * 10) * 1000;
    }
  }
  return token;
}

function consoleGet(organization, data, path, name) {
  const response = http.get(`${apiUrl}${path}`, {
    headers: { Authorization: `Bearer ${consoleToken(organization, data)}` },
    tags: { name },
  });
  check(response, { [`${name} 200`]: (r) => r.status === 200 });
  return response;
}

// The text search scans the documents table (ILIKE '%...%'), so its share decides most of the database's load.
const searchWeight = Number(__ENV.SEARCH_WEIGHT ?? 15);

/** What the console's server asks the API for while someone works through their documents. */
export function consoleApi(data) {
  const organization = organizationOf();
  const action = weighted({
    list: 45,
    nextPage: 10,
    search: searchWeight,
    detail: 20,
    issuers: 5,
    audit: 5,
  });
  if (action === "list") {
    consoleGet(organization, data, "/console/documents?limit=50", "GET /console/documents");
  } else if (action === "nextPage") {
    const first = consoleGet(
      organization,
      data,
      "/console/documents?limit=50",
      "GET /console/documents",
    );
    const cursor = first.status === 200 ? first.json("nextCursor") : null;
    if (cursor) {
      consoleGet(
        organization,
        data,
        `/console/documents?limit=50&before=${cursor}`,
        "GET /console/documents?before",
      );
    }
  } else if (action === "search") {
    const q = encodeURIComponent(`Cliente ${Math.floor(Math.random() * 500)}`);
    consoleGet(
      organization,
      data,
      `/console/documents?limit=50&q=${q}`,
      "GET /console/documents?q",
    );
  } else if (action === "detail") {
    consoleGet(
      organization,
      data,
      `/console/documents/${pick(organization.documentIds)}`,
      "GET /console/documents/{id}",
    );
  } else if (action === "issuers") {
    consoleGet(organization, data, "/console/issuers", "GET /console/issuers");
  } else {
    consoleGet(organization, data, "/console/audit-log?limit=50", "GET /console/audit-log");
  }
}

// --- Console: the pages a signed-in person loads (SSR through the console's server) -----------------------------------

function page(organization, path, name) {
  const response = http.get(`${consoleUrl}${path}`, {
    headers: { Cookie: cookieHeader(organization), Accept: "text/html" },
    tags: { name },
    redirects: 0,
  });
  // A redirect here means the session was not accepted (to /sign-in), not a slow page.
  check(response, { [`${name} 200`]: (r) => r.status === 200 });
  return response;
}

/** A person opening the console: full server-rendered pages, each of which calls the API behind it. */
export function consolePages() {
  const organization = organizationOf();
  const action = weighted({ overview: 20, documents: 40, document: 25, issuers: 15 });
  if (action === "overview") {
    page(organization, "/overview", "page /overview");
  } else if (action === "documents") {
    page(organization, "/documents", "page /documents");
  } else if (action === "document") {
    page(organization, `/documents/${pick(organization.documentIds)}`, "page /documents/{id}");
  } else {
    page(organization, "/issuers", "page /issuers");
  }
}
