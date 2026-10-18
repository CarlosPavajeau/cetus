import { queryOptions } from "@tanstack/react-query";

import { listIssuers } from "./server";

export const issuersQuery = queryOptions({
  queryKey: ["issuers"],
  queryFn: () => listIssuers(),
});
