import { createServerFn } from "@tanstack/react-start";

import { api, unwrap } from "~/lib/api/client";

export const listIssuers = createServerFn({ method: "GET" }).handler(async () =>
  unwrap(await api.GET("/console/issuers")),
);
