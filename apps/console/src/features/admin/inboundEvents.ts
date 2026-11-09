import { createServerFn } from "@tanstack/react-start";
import { type } from "arktype";

import { CetusApiError, api } from "~/lib/api/client";
import type { InboundEvent } from "~/lib/api/types";

import { requireStaff } from "./server";

/** The latest provider events the worker gave up on. */
export const listInboundEvents = createServerFn({ method: "GET" }).handler(
  async (): Promise<InboundEvent[]> => {
    await requireStaff();
    return api.get("/admin/inbound-events");
  },
);

export const requeueInboundEvent = createServerFn({ method: "POST" })
  .validator(type({ id: "string.uuid" }))
  .handler(async ({ data }): Promise<InboundEvent> => {
    await requireStaff("admin");
    try {
      return await api.post("/admin/inbound-events/{id}/requeue", { params: { path: data } });
    } catch (error) {
      if (error instanceof CetusApiError) {
        throw new Error(
          error.code === "event_not_failed" || error.status === 404
            ? "Alguien ya volvió a encolar este evento. Recarga la página."
            : "No pudimos volver a encolar el evento. Recarga la página e inténtalo de nuevo.",
          { cause: error },
        );
      }
      throw error;
    }
  });
