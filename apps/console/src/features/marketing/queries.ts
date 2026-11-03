import { queryOptions } from "@tanstack/react-query";

import { getSession } from "~/features/session/server";

import { getMarketingConfig, highlightSnippets, listPublicPlans } from "./server";

const marketingKey = ["marketing"] as const;

export const marketingConfigQuery = queryOptions({
  queryKey: [...marketingKey, "config"],
  queryFn: () => getMarketingConfig(),
  staleTime: Infinity,
});

export const publicPlansQuery = queryOptions({
  queryKey: [...marketingKey, "plans"],
  queryFn: () => listPublicPlans(),
  staleTime: 5 * 60 * 1000,
});

export const snippetsQuery = queryOptions({
  queryKey: [...marketingKey, "snippets"],
  queryFn: () => highlightSnippets(),
  staleTime: Infinity,
});

/** Read only in the browser, so the marketing HTML is the same for everyone and can be cached. */
export const visitorSessionQuery = queryOptions({
  queryKey: [...marketingKey, "session"],
  queryFn: () => getSession(),
  staleTime: 60 * 1000,
});
