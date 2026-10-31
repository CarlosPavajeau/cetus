import { queryOptions } from "@tanstack/react-query";

import { getBillingProfile, getCredits, getOrder, listOrders, listPlanOffers } from "./server";

export const billingKey = ["billing"] as const;

export const creditsQuery = queryOptions({
  queryKey: [...billingKey, "credits"],
  queryFn: () => getCredits(),
});

export const planOffersQuery = queryOptions({
  queryKey: [...billingKey, "plans"],
  queryFn: () => listPlanOffers(),
});

export const billingProfileQuery = queryOptions({
  queryKey: [...billingKey, "profile"],
  queryFn: () => getBillingProfile(),
});

export const ordersQuery = queryOptions({
  queryKey: [...billingKey, "orders"],
  queryFn: () => listOrders(),
});

export function orderQuery(id: string) {
  return queryOptions({
    queryKey: [...billingKey, "orders", id],
    queryFn: () => getOrder({ data: { id } }),
  });
}
