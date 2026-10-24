import { queryOptions } from "@tanstack/react-query";

import type { Environment } from "~/lib/api/types";

import { listCustomers, listProducts } from "./server";

export const catalogKey = ["catalog"] as const;

export const customersQuery = (environment: Environment) =>
  queryOptions({
    queryKey: [...catalogKey, "customers", environment],
    queryFn: () => listCustomers({ data: { environment } }),
  });

export const productsQuery = (environment: Environment) =>
  queryOptions({
    queryKey: [...catalogKey, "products", environment],
    queryFn: () => listProducts({ data: { environment } }),
  });
