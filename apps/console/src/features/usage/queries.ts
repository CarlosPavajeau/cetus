import { queryOptions } from "@tanstack/react-query";

import { getUsage } from "./server";

export const usageQuery = queryOptions({
  queryKey: ["usage"],
  queryFn: () => getUsage(),
});
