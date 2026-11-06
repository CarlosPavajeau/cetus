import { createServerFn } from "@tanstack/react-start";
import { type } from "arktype";

import { api } from "~/lib/api/client";
import type { IssuerAlerts, IssuerMetrics, Metrics } from "~/lib/api/types";

const environment = "'SANDBOX' | 'TEST' | 'LIVE'";

/** An environment's documents, of one issuer or all, issued between two days in Colombia, both included. */
export const getMetrics = createServerFn({ method: "GET" })
  .validator(
    type({
      environment,
      "issuerId?": "string.uuid",
      from: "string.date.iso",
      to: "string.date.iso",
    }),
  )
  .handler(({ data }): Promise<Metrics> =>
    api.get("/console/metrics", { params: { query: data } }),
  );

/** Each issuer's documents of the period apart, and its active certificate. */
export const getIssuerMetrics = createServerFn({ method: "GET" })
  .validator(type({ environment, from: "string.date.iso", to: "string.date.iso" }))
  .handler(({ data }): Promise<IssuerMetrics[]> =>
    api.get("/console/metrics/issuers", { params: { query: data } }),
  );

/** The certificates about to expire and the numbering ranges of an environment's issuers, or of one. */
export const getAlerts = createServerFn({ method: "GET" })
  .validator(type({ environment, "issuerId?": "string.uuid" }))
  .handler(({ data }): Promise<IssuerAlerts> =>
    api.get("/console/alerts", { params: { query: data } }),
  );
