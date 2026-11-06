import { queryOptions } from "@tanstack/react-query";

import type { Environment } from "~/lib/api/types";

import type { DateRange } from "./periods";
import { getAlerts, getMetrics } from "./server";

export function metricsQuery(environment: Environment, range: DateRange, issuerId?: string) {
  return queryOptions({
    queryKey: ["metrics", environment, issuerId ?? null, range.from, range.to],
    queryFn: () => getMetrics({ data: { environment, ...(issuerId && { issuerId }), ...range } }),
  });
}

export function alertsQuery(environment: Environment) {
  return queryOptions({
    queryKey: ["alerts", environment],
    queryFn: () => getAlerts({ data: { environment } }),
  });
}
