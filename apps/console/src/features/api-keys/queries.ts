import { queryOptions } from "@tanstack/react-query";

import { getApiKey, listApiKeys } from "./server";

export const apiKeysQuery = queryOptions({
  queryKey: ["api-keys"],
  queryFn: () => listApiKeys(),
});

/** One key with its recent requests; null when the account has no such key. Under the list's key, so it is invalidated with it. */
export function apiKeyQuery(id: string) {
  return queryOptions({
    queryKey: [...apiKeysQuery.queryKey, id],
    queryFn: () => getApiKey({ data: { id } }),
  });
}
