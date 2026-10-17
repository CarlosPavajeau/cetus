import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { api, unwrap } from "~/lib/api/client";

export const listApiKeys = createServerFn({ method: "GET" }).handler(async () =>
  unwrap(await api.GET("/console/api-keys")),
);

export const createApiKey = createServerFn({ method: "POST" })
  .validator(z.object({ name: z.string().min(1).max(80), environment: z.enum(["TEST", "LIVE"]) }))
  .handler(async ({ data }) => unwrap(await api.POST("/console/api-keys", { body: data })));

export const revokeApiKey = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) =>
    unwrap(await api.DELETE("/console/api-keys/{id}", { params: { path: { id: data.id } } })),
  );
