import { createServerFn } from "@tanstack/react-start";
import { type } from "arktype";

import { CetusApiError, api } from "~/lib/api/client";
import type { WebhookDeliveryPage, WebhookEndpoint } from "~/lib/api/types";

import { createWebhookEndpointSchema } from "./schema";

export const listWebhookEndpoints = createServerFn({ method: "GET" }).handler(() =>
  api.get("/console/webhook-endpoints"),
);

export const listWebhookEventTypes = createServerFn({ method: "GET" }).handler(() =>
  api.get("/console/webhook-endpoints/event-types"),
);

/** One endpoint, or null when it does not exist or belongs to another account. */
export const getWebhookEndpoint = createServerFn({ method: "GET" })
  .validator(type({ id: "string.uuid" }))
  .handler(async ({ data }): Promise<WebhookEndpoint | null> => {
    try {
      return await api.get("/console/webhook-endpoints/{id}", {
        params: { path: { id: data.id } },
      });
    } catch (error) {
      if (error instanceof CetusApiError && error.status === 404) {
        return null;
      }
      throw error;
    }
  });

const creationMessages: Record<string, string> = {
  invalid_webhook_url:
    "Cetus no puede enviar a esa URL. En producción debe usar https, y nunca puede apuntar a una dirección interna o privada.",
  unknown_event_type:
    "Uno de los eventos elegidos no existe. Recarga la página e inténtalo de nuevo.",
};

/** Registers an endpoint; the signing secret comes back only here. */
export const createWebhookEndpoint = createServerFn({ method: "POST" })
  .validator(createWebhookEndpointSchema)
  .handler(async ({ data }) => {
    try {
      return await api.post("/console/webhook-endpoints", {
        body: { ...data, description: data.description.trim() || undefined },
      });
    } catch (error) {
      if (error instanceof CetusApiError && creationMessages[error.code]) {
        throw new Error(creationMessages[error.code], { cause: error });
      }
      throw error;
    }
  });

export const disableWebhookEndpoint = createServerFn({ method: "POST" })
  .validator(type({ id: "string.uuid" }))
  .handler(({ data }) =>
    api.delete("/console/webhook-endpoints/{id}", { params: { path: { id: data.id } } }),
  );

/** With `redeliver`, the events it missed while failing or disabled are sent again. */
export const enableWebhookEndpoint = createServerFn({ method: "POST" })
  .validator(type({ id: "string.uuid", redeliver: "boolean" }))
  .handler(({ data }) =>
    api.post("/console/webhook-endpoints/{id}/enable", {
      params: { path: { id: data.id } },
      body: { redeliver: data.redeliver },
    }),
  );

/** One page of the endpoint's deliveries, newest first. */
export const listWebhookDeliveries = createServerFn({ method: "GET" })
  .validator(type({ id: "string.uuid", "before?": "string.uuid | undefined" }))
  .handler(({ data }): Promise<WebhookDeliveryPage> =>
    api.get("/console/webhook-endpoints/{id}/deliveries", {
      params: { path: { id: data.id }, query: { before: data.before, limit: 50 } },
    }),
  );

const retryMessages: Record<string, string> = {
  endpoint_disabled: "El webhook está desactivado. Reactívalo para reenviar.",
  delivery_in_progress: "Esta entrega ya está en cola para enviarse.",
};

export type RetryResult = { ok: true } | { ok: false; message: string };

/** Sends the event again, with the same id and body. */
export const retryWebhookDelivery = createServerFn({ method: "POST" })
  .validator(type({ id: "string.uuid", deliveryId: "string.uuid" }))
  .handler(async ({ data }): Promise<RetryResult> => {
    try {
      await api.post("/console/webhook-endpoints/{id}/deliveries/{deliveryId}/retry", {
        params: { path: { id: data.id, deliveryId: data.deliveryId } },
      });
      return { ok: true };
    } catch (error) {
      if (error instanceof CetusApiError && retryMessages[error.code]) {
        return { ok: false, message: retryMessages[error.code]! };
      }
      throw error;
    }
  });
