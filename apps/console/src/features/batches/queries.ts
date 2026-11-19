import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";

import type { BatchStatus, Environment } from "~/lib/api/types";

import { getBatch, listBatchDocuments, listBatches } from "./server";

export const batchesKey = ["batches"] as const;

export const openStatuses: readonly BatchStatus[] = ["RECEIVED", "EXPANDING", "PROCESSING"];

/** Every few seconds while a batch is open, so its progress moves without reloading. */
const pollMs = 3000;

export function batchesQuery(environment: Environment) {
  return infiniteQueryOptions({
    queryKey: [...batchesKey, "list", environment],
    queryFn: ({ pageParam }) => listBatches({ data: { environment, before: pageParam } }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    refetchInterval: (query) =>
      query.state.data?.pages.some((page) =>
        page.items.some((batch) => openStatuses.includes(batch.status)),
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
      return batch && openStatuses.includes(batch.status) ? pollMs : false;
    },
  });
}

export function batchDocumentsQuery(id: string, open: boolean) {
  return infiniteQueryOptions({
    queryKey: [...batchesKey, id, "documents"],
    queryFn: ({ pageParam }) => listBatchDocuments({ data: { id, after: pageParam } }),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    refetchInterval: open ? pollMs : false,
  });
}
