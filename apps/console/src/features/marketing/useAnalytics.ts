import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

import { startAnalytics } from "./analytics";
import { rememberCampaign } from "./campaign";
import { marketingConfigQuery } from "./queries";

/** Starts PostHog on the pages that call it, once the server says there is a key, and keeps the visit's campaign. */
export function useAnalytics() {
  const { data: config } = useQuery(marketingConfigQuery);
  const key = config?.posthogKey ?? null;

  useEffect(() => {
    rememberCampaign(window.location.search);
  }, []);

  useEffect(() => {
    if (key !== null) {
      startAnalytics(key);
    }
  }, [key]);
}
