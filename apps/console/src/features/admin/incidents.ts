import { createServerFn } from "@tanstack/react-start";
import { type } from "arktype";

import { CetusApiError, api } from "~/lib/api/client";
import type { Incident } from "~/lib/api/types";

import { incidentSchema } from "./incidentSchema";
import { requireStaff } from "./server";

/** Calls the API and turns its errors into a message the team can act on. */
async function call<T>(request: () => Promise<T>): Promise<T> {
  try {
    return await request();
  } catch (error) {
    if (error instanceof CetusApiError) {
      throw new Error(
        error.code === "incident_resolved"
          ? "El incidente ya está resuelto."
          : "No pudimos guardar el incidente. Recarga la página e inténtalo de nuevo.",
        { cause: error },
      );
    }
    throw error;
  }
}

/** The latest incidents, open and resolved. */
export const listIncidents = createServerFn({ method: "GET" }).handler(
  async (): Promise<Incident[]> => {
    await requireStaff();
    return api.get("/admin/incidents");
  },
);

export const openIncident = createServerFn({ method: "POST" })
  .validator(incidentSchema)
  .handler(async ({ data }) => {
    await requireStaff("admin");
    return call(() => api.post("/admin/incidents", { body: data }));
  });

export const updateIncident = createServerFn({ method: "POST" })
  .validator(incidentSchema.and({ id: "string.uuid" }))
  .handler(async ({ data: { id, ...incident } }) => {
    await requireStaff("admin");
    return call(() =>
      api.put("/admin/incidents/{id}", { params: { path: { id } }, body: incident }),
    );
  });

export const resolveIncident = createServerFn({ method: "POST" })
  .validator(type({ id: "string.uuid" }))
  .handler(async ({ data }) => {
    await requireStaff("admin");
    return call(() => api.post("/admin/incidents/{id}/resolve", { params: { path: data } }));
  });
