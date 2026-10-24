import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";

import { refreshing } from "./refresh";
import { type DocumentFilters, getDocument, listDocuments } from "./server";

/** Prefix shared by the lists and the details, for invalidating them all after a change. */
export const documentsKey = ["documents"] as const;

/** The documents for one set of filters; each page continues from the previous page's cursor. */
export function documentsQuery(filters: DocumentFilters) {
  return infiniteQueryOptions({
    queryKey: [...documentsKey, "list", filters],
    queryFn: ({ pageParam }) => listDocuments({ data: { ...filters, before: pageParam } }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

/**
 * One document by id; null when the account has no such document. It refreshes itself while the DIAN has
 * not answered or an email is still on its way, so the page shows the result without reloading.
 */
export function documentDetailQuery(id: string) {
  return queryOptions({
    queryKey: [...documentsKey, id],
    queryFn: () => getDocument({ data: { id } }),
    refetchInterval: (query) => {
      const document = query.state.data;
      return document && refreshing(document) ? 2000 : false;
    },
  });
}
