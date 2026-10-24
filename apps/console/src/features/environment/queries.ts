import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useMatches } from "@tanstack/react-router";

import type { Environment } from "~/lib/api/types";

import { getActiveEnvironment } from "./server";

export const activeEnvironmentQuery = queryOptions({
  queryKey: ["active-environment"],
  queryFn: () => getActiveEnvironment(),
  // Only the selector changes it, and it writes the new value into the cache.
  staleTime: Infinity,
});

export function useActiveEnvironment() {
  return useSuspenseQuery(activeEnvironmentQuery).data;
}

const environments = ["SANDBOX", "TEST", "LIVE"] as const satisfies readonly Environment[];

function isEnvironment(value: unknown): value is Environment {
  return environments.some((environment) => environment === value);
}

/**
 * The environment of what the page shows, when it shows one thing that has its own (a document returns
 * { environment } from its loader), whatever the selector says; null on lists and forms.
 */
export function usePageEnvironment(): Environment | null {
  return useMatches({
    select: (matches) =>
      matches.reduce<Environment | null>((found, match) => {
        const data: unknown = match.loaderData;
        const value =
          typeof data === "object" && data !== null && "environment" in data
            ? data.environment
            : undefined;
        return isEnvironment(value) ? value : found;
      }, null),
  });
}
