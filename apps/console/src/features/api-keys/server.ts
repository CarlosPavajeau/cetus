import { createServerFn } from "@tanstack/react-start";
import { type } from "arktype";
import { eq } from "drizzle-orm";

import { CetusApiError, api } from "~/lib/api/client";
import type { ApiKeyDetail } from "~/lib/api/types";
import { user } from "~/lib/auth/schema";
import { db } from "~/lib/db";

import { createApiKeySchema } from "./schema";

export type ApiKeyDetails = ApiKeyDetail & { createdByName: string | null };

export const listApiKeys = createServerFn({ method: "GET" }).handler(() =>
  api.get("/console/api-keys"),
);

/**
 * One key with its recent requests, or null when it does not exist or belongs to another account.
 * The API only knows the Better Auth id of the creator, so the name is resolved here.
 */
export const getApiKey = createServerFn({ method: "GET" })
  .validator(type({ id: "string.uuid" }))
  .handler(async ({ data }): Promise<ApiKeyDetails | null> => {
    let detail: ApiKeyDetail;
    try {
      detail = await api.get("/console/api-keys/{id}", { params: { path: { id: data.id } } });
    } catch (error) {
      if (error instanceof CetusApiError && error.status === 404) {
        return null;
      }
      throw error;
    }
    const createdBy = detail.key.createdBy;
    const [creator] = createdBy
      ? await db
          .select({ name: user.name, email: user.email })
          .from(user)
          .where(eq(user.id, createdBy))
      : [];
    return { ...detail, createdByName: creator ? creator.name || creator.email : null };
  });

export const createApiKey = createServerFn({ method: "POST" })
  .validator(createApiKeySchema)
  .handler(({ data }) => api.post("/console/api-keys", { body: data }));

export const revokeApiKey = createServerFn({ method: "POST" })
  .validator(type({ id: "string.uuid" }))
  .handler(({ data }) =>
    api.delete("/console/api-keys/{id}", { params: { path: { id: data.id } } }),
  );
