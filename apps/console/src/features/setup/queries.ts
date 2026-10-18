import { queryOptions } from "@tanstack/react-query";

import { getIssuer } from "./server";

// Under ["issuers"], so invalidating the issuer list also refreshes the detail.
export const issuerDetailQuery = (id: string) =>
  queryOptions({
    queryKey: ["issuers", id],
    queryFn: () => getIssuer({ data: { id } }),
  });
