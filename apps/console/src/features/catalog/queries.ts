import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";

import type { Environment } from "~/lib/api/types";

import { listCustomers, listProducts } from "./server";

export const catalogKey = ["catalog"] as const;

/** What a picker offers while the person types: the best matches, searched on the server. */
const pickerSize = 20;
/** The rows the catalog pages load at a time. */
const pageSize = 50;

export const customerSearchQuery = (environment: Environment, q: string) =>
  queryOptions({
    queryKey: [...catalogKey, "customers", environment, "search", q],
    queryFn: () => listCustomers({ data: { environment, q: q || undefined, limit: pickerSize } }),
  });

export const productSearchQuery = (environment: Environment, q: string) =>
  queryOptions({
    queryKey: [...catalogKey, "products", environment, "search", q],
    queryFn: () => listProducts({ data: { environment, q: q || undefined, limit: pickerSize } }),
  });

export const customerPagesQuery = (environment: Environment, q: string) =>
  infiniteQueryOptions({
    queryKey: [...catalogKey, "customers", environment, "pages", q],
    queryFn: ({ pageParam }) =>
      listCustomers({
        data: { environment, q: q || undefined, before: pageParam, limit: pageSize },
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });

export const productPagesQuery = (environment: Environment, q: string) =>
  infiniteQueryOptions({
    queryKey: [...catalogKey, "products", environment, "pages", q],
    queryFn: ({ pageParam }) =>
      listProducts({
        data: { environment, q: q || undefined, before: pageParam, limit: pageSize },
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
