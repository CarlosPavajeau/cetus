import { queryOptions } from "@tanstack/react-query";

import type { Environment } from "~/lib/api/types";

import type { DateRange } from "./periods";
import { getAlerts, getIssuerMetrics, getMetrics } from "./server";

export function metricsQuery(environment: Environment, range: DateRange, issuerId?: string) {
  return queryOptions({
    queryKey: ["metrics", environment, issuerId ?? null, range.from, range.to],
    queryFn: () => getMetrics({ data: { environment, ...(issuerId && { issuerId }), ...range } }),
  });
}

export function issuerMetricsQuery(environment: Environment, range: DateRange) {
  return queryOptions({
    queryKey: ["metrics", "issuers", environment, range.from, range.to],
    queryFn: () => getIssuerMetrics({ data: { environment, ...range } }),
  });
}

export function alertsQuery(environment: Environment, issuerId?: string) {
  return queryOptions({
    queryKey: ["alerts", environment, issuerId ?? null],
    queryFn: () => getAlerts({ data: { environment, ...(issuerId && { issuerId }) } }),
  });
}
