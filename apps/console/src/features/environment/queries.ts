import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";

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
