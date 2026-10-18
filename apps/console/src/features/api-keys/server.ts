import { createServerFn } from "@tanstack/react-start";
import { type } from "arktype";
import { api, unwrap } from "~/lib/api/client";

export const listApiKeys = createServerFn({ method: "GET" }).handler(async () =>
  unwrap(await api.GET("/console/api-keys")),
);

export const createApiKey = createServerFn({ method: "POST" })
  .validator(type({ "+": "delete", name: "0 < string <= 80", environment: "'TEST' | 'LIVE'" }))
  .handler(async ({ data }) => unwrap(await api.POST("/console/api-keys", { body: data })));

export const revokeApiKey = createServerFn({ method: "POST" })
  .validator(type({ id: "string.uuid" }))
  .handler(async ({ data }) =>
    unwrap(await api.DELETE("/console/api-keys/{id}", { params: { path: { id: data.id } } })),
  );
