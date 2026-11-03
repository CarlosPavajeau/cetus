import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

import { startAnalytics } from "./analytics";
import { marketingConfigQuery } from "./queries";

/** Starts PostHog on the pages that call it, once the server says there is a key. */
export function useAnalytics() {
  const { data: config } = useQuery(marketingConfigQuery);
  const key = config?.posthogKey ?? null;

  useEffect(() => {
    if (key !== null) {
      startAnalytics(key);
    }
  }, [key]);
}
