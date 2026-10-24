import { queryOptions } from "@tanstack/react-query";

import { canIssueLive } from "./server";

export const canIssueLiveQuery = queryOptions({
  queryKey: ["issuance", "can-issue-live"],
  queryFn: () => canIssueLive(),
});
