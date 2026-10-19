import { queryOptions } from "@tanstack/react-query";

import { getIssuer, listIssuers } from "./server";

export const issuersQuery = queryOptions({
  queryKey: ["issuers"],
  queryFn: () => listIssuers(),
});

// Under ["issuers"], so invalidating the issuer list also refreshes the detail. While the worker is
// checking a range with the DIAN, the detail refreshes itself until the answer arrives.
export const issuerDetailQuery = (id: string) =>
  queryOptions({
    queryKey: ["issuers", id],
    queryFn: () => getIssuer({ data: { id } }),
    refetchInterval: (query) =>
      query.state.data?.ranges.some((range) => range.verificationStatus === "PENDING")
        ? 3000
        : false,
  });
