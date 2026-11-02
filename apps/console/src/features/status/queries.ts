import { queryOptions } from "@tanstack/react-query";

import { getPlatformStatus } from "./server";

/** Polled while the console is open, so a DIAN outage shows up without reloading. */
export const platformStatusQuery = queryOptions({
  queryKey: ["platform-status"],
  queryFn: () => getPlatformStatus(),
  refetchInterval: 60_000,
  staleTime: 30_000,
});
