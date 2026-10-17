import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { cetusApi } from "~/lib/api/client";
import type { Account } from "~/lib/api/types";

/** Creates (or returns) the Cetus account linked to the active Better Auth organization. */
export const bootstrapAccount = createServerFn({ method: "POST" })
  .validator(z.object({ name: z.string().min(1) }))
  .handler(({ data }) =>
    cetusApi<Account>("/console/account", { method: "POST", body: JSON.stringify(data) }),
  );

export const getAccount = createServerFn({ method: "GET" }).handler(() =>
  cetusApi<Account>("/console/account"),
);
