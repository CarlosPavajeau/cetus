import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";

import type { Environment } from "~/lib/api/types";

import { statusesOpen } from "./labels";
import { getBatch, listBatchDocuments, listBatches } from "./server";

export const batchesKey = ["batches"] as const;

const pollMs = 3000;

export function batchesQuery(environment: Environment) {
  return infiniteQueryOptions({
    queryKey: [...batchesKey, "list", environment],
    queryFn: ({ pageParam }) => listBatches({ data: { environment, before: pageParam } }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    refetchInterval: (query) =>
      query.state.data?.pages.some((page) =>
        page.items.some((batch) => statusesOpen.includes(batch.status)),
      )
        ? pollMs
        : false,
  });
}

export function batchQuery(id: string) {
  return queryOptions({
    queryKey: [...batchesKey, id],
    queryFn: () => getBatch({ data: { id } }),
    refetchInterval: (query) => {
      const batch = query.state.data;
      return batch && statusesOpen.includes(batch.status) ? pollMs : false;
    },
  });
}

export function batchDocumentsKey(id: string) {
  return [...batchesKey, id, "documents"] as const;
}

/** Not polled: every loaded page would refetch each time. The page refetches it when the batch's counts change. */
export function batchDocumentsQuery(id: string) {
  return infiniteQueryOptions({
    queryKey: batchDocumentsKey(id),
    queryFn: ({ pageParam }) => listBatchDocuments({ data: { id, after: pageParam } }),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}
