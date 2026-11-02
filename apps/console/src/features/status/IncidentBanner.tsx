import { useQuery } from "@tanstack/react-query";
import { TriangleAlertIcon } from "lucide-react";
import type { ReactNode } from "react";

import { useActiveEnvironment, usePageEnvironment } from "~/features/environment/queries";
import type { Environment, StatusComponent } from "~/lib/api/types";
import { docsUrl } from "~/lib/docs";

import { platformStatusQuery } from "./queries";

const dianComponent: Record<Environment, StatusComponent | null> = {
  LIVE: "DIAN_LIVE",
  TEST: "DIAN_TEST",
  SANDBOX: null,
};

const dianFailing =
  "La DIAN presenta fallas; tus documentos están en cola y se enviarán automáticamente.";

/**
 * Open incidents and DIAN outages of the environment in view. Says nothing when the status cannot be read: the
 * console keeps working, and the status page reports an API that does not answer.
 */
export function IncidentBanner() {
  const active = useActiveEnvironment();
  const page = usePageEnvironment();
  const { data: status } = useQuery(platformStatusQuery);
  if (!status) {
    return null;
  }
  const dian = dianComponent[page ?? active];
  const relevant = (component: StatusComponent) =>
    !component.startsWith("DIAN_") || component === dian;
  const incidents = status.incidents.filter(
    (incident) => incident.resolvedAt === null && relevant(incident.component),
  );
  const dianDown =
    dian !== null &&
    !incidents.some((incident) => incident.component === dian) &&
    status.components.some(
      (component) => component.component === dian && component.status !== "OPERATIONAL",
    );
  if (incidents.length === 0 && !dianDown) {
    return null;
  }
  return (
    <aside
      aria-label="Incidentes"
      className="flex flex-col items-center gap-1 bg-warning-surface px-4 py-1.5 text-xs text-warning-surface-foreground"
    >
      {dianDown && <Line>{dianFailing}</Line>}
      {incidents.map((incident) => (
        <Line key={incident.id}>
          <strong>{incident.title}:</strong> {incident.message}
        </Line>
      ))}
    </aside>
  );
}

function Line({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-center gap-2 text-center">
      <TriangleAlertIcon className="size-3.5 shrink-0" aria-hidden />
      <span>
        {children}{" "}
        <a
          href={`${docsUrl}/estado`}
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-4"
        >
          Ver estado
        </a>
      </span>
    </p>
  );
}
