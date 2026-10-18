import { queryOptions } from "@tanstack/react-query";

import { getAccount } from "./server";

export const accountQuery = queryOptions({
  queryKey: ["account"],
  queryFn: () => getAccount(),
});
