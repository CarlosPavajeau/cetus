import { type } from "arktype";

import type { IncidentImpact, StatusComponent } from "~/lib/api/types";

export const statusComponents = [
  "API",
  "PROCESSING",
  "DIAN_LIVE",
  "DIAN_TEST",
] as const satisfies readonly StatusComponent[];

export const incidentImpacts = ["DEGRADED", "OUTAGE"] as const satisfies readonly IncidentImpact[];

/** What customers read on the status page and in the console's banner. */
export const incidentSchema = type({
  component: type.enumerated(...statusComponents),
  impact: type.enumerated(...incidentImpacts),
  title: type("string.trim").to(
    type("3 <= string <= 120").configure({ message: "Escribe un título de 3 a 120 caracteres." }),
  ),
  message: type("string.trim").to(
    type("3 <= string <= 1000").configure({
      message: "Escribe el mensaje (entre 3 y 1000 caracteres).",
    }),
  ),
});
