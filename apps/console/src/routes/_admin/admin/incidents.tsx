import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { PageHeader } from "~/components/PageHeader";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { IncidentDialog } from "~/features/admin/IncidentDialog";
import { resolveIncident } from "~/features/admin/incidents";
import { adminIncidentsQuery, adminKey } from "~/features/admin/queries";
import { dayFormat, timeFormat } from "~/features/audit-log/labels";
import { componentLabel, impactLabel } from "~/features/status/labels";
import type { Incident } from "~/lib/api/types";
import { docsUrl } from "~/lib/docs";

export const Route = createFileRoute("/_admin/admin/incidents")({
  loader: ({ context: { queryClient } }) =>
    queryClient.query({ ...adminIncidentsQuery, staleTime: "static" }),
  component: Incidents,
});

function dateTime(value: string) {
  const date = new Date(value);
  return `${dayFormat.format(date)}, ${timeFormat.format(date)}`;
}

function Incidents() {
  const { platformRole } = Route.useRouteContext();
  const { data: incidents } = useSuspenseQuery(adminIncidentsQuery);
  const admin = platformRole === "admin";

  return (
    <>
      <PageHeader
        title="Incidentes"
        lead={
          <>
            Lo que se publica en la{" "}
            <a
              href={`${docsUrl}/estado`}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-4"
            >
              página de estado
            </a>{" "}
            y en el aviso de la consola. Las fallas de la DIAN se detectan solas; publica un
            incidente para explicar algo más.
          </>
        }
        action={admin && <IncidentDialog />}
      />
      {incidents.length === 0 ? (
        <p className="text-xs text-muted-foreground">No se ha publicado ningún incidente.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Incidente</TableHead>
              <TableHead>Componente</TableHead>
              <TableHead>Inicio</TableHead>
              <TableHead>Estado</TableHead>
              {admin && <TableHead />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {incidents.map((incident) => (
              <IncidentRow key={incident.id} incident={incident} admin={admin} />
            ))}
          </TableBody>
        </Table>
      )}
    </>
  );
}

function IncidentRow({ incident, admin }: { incident: Incident; admin: boolean }) {
  const queryClient = useQueryClient();
  const resolve = useMutation({
    mutationFn: resolveIncident,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKey }),
  });
  const open = incident.resolvedAt === null;

  return (
    <TableRow>
      <TableCell className="align-top whitespace-normal">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-medium">{incident.title}</span>
          <span className="text-2xs text-muted-foreground">{incident.message}</span>
          {resolve.isError && (
            <Alert variant="destructive" className="mt-2">
              <AlertDescription>{resolve.error.message}</AlertDescription>
            </Alert>
          )}
        </div>
      </TableCell>
      <TableCell className="align-top text-xs">
        {componentLabel[incident.component]} · {impactLabel[incident.impact]}
      </TableCell>
      <TableCell className="align-top text-xs">{dateTime(incident.startedAt)}</TableCell>
      <TableCell className="align-top">
        {incident.resolvedAt === null ? (
          <Badge variant="destructive">Abierto</Badge>
        ) : (
          <span className="text-2xs text-muted-foreground">
            Resuelto el {dateTime(incident.resolvedAt)}
          </span>
        )}
      </TableCell>
      {admin && (
        <TableCell className="align-top">
          {open && (
            <div className="flex justify-end gap-2">
              <IncidentDialog incident={incident} />
              <Button
                size="sm"
                disabled={resolve.isPending}
                onClick={() => resolve.mutate({ data: { id: incident.id } })}
              >
                {resolve.isPending && <Spinner data-icon="inline-start" />}
                Resolver
              </Button>
            </div>
          )}
        </TableCell>
      )}
    </TableRow>
  );
}
