import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { cetusApi } from "~/lib/api/client";
import type { ApiKey, CreatedApiKey } from "~/lib/api/types";

export const listApiKeys = createServerFn({ method: "GET" }).handler(() =>
  cetusApi<ApiKey[]>("/console/api-keys"),
);

export const createApiKey = createServerFn({ method: "POST" })
  .validator(z.object({ name: z.string().min(1).max(80), environment: z.enum(["TEST", "LIVE"]) }))
  .handler(({ data }) =>
    cetusApi<CreatedApiKey>("/console/api-keys", { method: "POST", body: JSON.stringify(data) }),
  );

export const revokeApiKey = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(({ data }) => cetusApi<void>(`/console/api-keys/${data.id}`, { method: "DELETE" }));
