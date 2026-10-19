import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";

import {
  getWebhookEndpoint,
  listWebhookDeliveries,
  listWebhookEndpoints,
  listWebhookEventTypes,
} from "./server";

export const webhookEndpointsQuery = queryOptions({
  queryKey: ["webhook-endpoints"],
  queryFn: () => listWebhookEndpoints(),
});

export const webhookEventTypesQuery = queryOptions({
  queryKey: ["webhook-event-types"],
  queryFn: () => listWebhookEventTypes(),
  staleTime: Infinity,
});

// Under ["webhook-endpoints"], so invalidating the list also refreshes the detail and its deliveries.
export function webhookEndpointQuery(id: string) {
  return queryOptions({
    queryKey: [...webhookEndpointsQuery.queryKey, id],
    queryFn: () => getWebhookEndpoint({ data: { id } }),
  });
}

export function webhookDeliveriesQuery(id: string) {
  return infiniteQueryOptions({
    queryKey: [...webhookEndpointsQuery.queryKey, id, "deliveries"],
    queryFn: ({ pageParam }) => listWebhookDeliveries({ data: { id, before: pageParam } }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}
