import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { api, unwrap } from "~/lib/api/client";

/** Creates (or returns) the Cetus account linked to the active Better Auth organization. */
export const bootstrapAccount = createServerFn({ method: "POST" })
  .validator(z.object({ name: z.string().min(1) }))
  .handler(async ({ data }) => unwrap(await api.POST("/console/account", { body: data })));

export const getAccount = createServerFn({ method: "GET" }).handler(async () =>
  unwrap(await api.GET("/console/account")),
);
