import { queryOptions } from "@tanstack/react-query";

import { listMembers } from "./server";

export const membersQuery = queryOptions({
  queryKey: ["members"],
  queryFn: () => listMembers(),
});
