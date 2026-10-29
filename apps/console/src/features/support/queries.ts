import { infiniteQueryOptions } from "@tanstack/react-query";

import { listSupportTickets } from "./server";

export const supportTicketsQuery = infiniteQueryOptions({
  queryKey: ["support-tickets"],
  queryFn: ({ pageParam }) => listSupportTickets({ data: { before: pageParam } }),
  initialPageParam: undefined as string | undefined,
  getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
});
