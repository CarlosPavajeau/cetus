import { queryOptions } from "@tanstack/react-query";

import { getIssuer, listIssuers } from "./server";
import { pendingVerification } from "./verification";

export const issuersQuery = queryOptions({
  queryKey: ["issuers"],
  queryFn: () => listIssuers(),
});

// Under ["issuers"], so invalidating the issuer list also refreshes the detail. While the worker is
// checking a range with the DIAN, the detail refreshes itself until the answer arrives: often at first, then
// rarely once it is late. Each refresh renders again, even with the same data, so a late range shows that it can
// be checked again once enough time passes.
export const issuerDetailQuery = (id: string) =>
  queryOptions({
    queryKey: ["issuers", id],
    queryFn: () => getIssuer({ data: { id } }),
    structuralSharing: false,
    refetchInterval: (query) => {
      const pending = query.state.data?.ranges.map((range) => pendingVerification(range)) ?? [];
      if (pending.includes("waiting")) {
        return 3000;
      }
      return pending.some((state) => state !== null) ? 30_000 : false;
    },
  });
