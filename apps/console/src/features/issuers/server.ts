import { createServerFn } from "@tanstack/react-start";
import { cetusApi } from "~/lib/api/client";
import type { Issuer } from "~/lib/api/types";

export const listIssuers = createServerFn({ method: "GET" }).handler(() =>
  cetusApi<Issuer[]>("/console/issuers"),
);
