import { createServerFn } from "@tanstack/react-start";
import { type } from "arktype";

import { api } from "~/lib/api/client";

/** Creates (or returns) the Cetus account linked to the active Better Auth organization. */
export const bootstrapAccount = createServerFn({ method: "POST" })
  .validator(type({ "+": "delete", name: "string > 0" }))
  .handler(({ data }) => api.post("/console/account", { body: data }));

export const getAccount = createServerFn({ method: "GET" }).handler(() =>
  api.get("/console/account"),
);
