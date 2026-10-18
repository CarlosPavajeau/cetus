import { createServerFn } from "@tanstack/react-start";
import { type } from "arktype";

import { api } from "~/lib/api/client";

import { createApiKeySchema } from "./schema";

export const listApiKeys = createServerFn({ method: "GET" }).handler(() =>
  api.get("/console/api-keys"),
);

export const createApiKey = createServerFn({ method: "POST" })
  .validator(createApiKeySchema)
  .handler(({ data }) => api.post("/console/api-keys", { body: data }));

export const revokeApiKey = createServerFn({ method: "POST" })
  .validator(type({ id: "string.uuid" }))
  .handler(({ data }) =>
    api.delete("/console/api-keys/{id}", { params: { path: { id: data.id } } }),
  );
