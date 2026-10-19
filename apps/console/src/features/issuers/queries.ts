import { queryOptions } from "@tanstack/react-query";

import { getIssuer, listIssuers } from "./server";

export const issuersQuery = queryOptions({
  queryKey: ["issuers"],
  queryFn: () => listIssuers(),
});

// Under ["issuers"], so invalidating the issuer list also refreshes the detail.
export const issuerDetailQuery = (id: string) =>
  queryOptions({
    queryKey: ["issuers", id],
    queryFn: () => getIssuer({ data: { id } }),
  });
