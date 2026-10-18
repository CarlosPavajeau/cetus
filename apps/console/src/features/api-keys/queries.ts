import { queryOptions } from "@tanstack/react-query";

import { listApiKeys } from "./server";

export const apiKeysQuery = queryOptions({
  queryKey: ["api-keys"],
  queryFn: () => listApiKeys(),
});
