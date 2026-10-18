import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { ArrowLeftIcon, HistoryIcon, LockKeyholeIcon } from "lucide-react";
import type { ReactNode } from "react";

import { PageHeader } from "~/components/PageHeader";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { apiKeysQuery } from "~/features/api-keys/queries";
import { AuditRecordNotice } from "~/features/audit-log/AuditRecordNotice";
import { actionLabel, actorTypeLabel, dayFormat, timeFormat } from "~/features/audit-log/labels";
import { auditEntryQuery } from "~/features/audit-log/queries";
import type { ActivityEntry } from "~/features/audit-log/server";
import { cn } from "~/lib/utils";

export const Route = createFileRoute("/_app/activity/$eventId")({
  // The key list names the API key that acted; the entry only carries its id.
  loader: async ({ context: { queryClient }, params }) => {
    const id = Number(params.eventId);
    if (!Number.isSafeInteger(id) || id <= 0) {
      throw notFound();
    }
    const [entry] = await Promise.all([
      queryClient.ensureQueryData(auditEntryQuery(id)),
      queryClient.ensureQueryData(apiKeysQuery),
    ]);
    if (!entry) {
      throw notFound();
    }
  },
  component: ActivityEvent,
  notFoundComponent: EventNotFound,
});

const actorNote: Record<ActivityEntry["actorType"], string> = {
  USER: "La acción se hizo desde la consola con la sesión de este usuario.",
  API_KEY: "La acción se hizo a través de la API con esta llave.",
  SYSTEM: "Este evento fue generado por el sistema, sin intervención de un usuario.",
};

function BackToActivity() {
  return (
    <Link
      to="/activity"
      className="flex w-fit items-center gap-1.75 text-xs text-muted-foreground hover:text-foreground"
    >
      <ArrowLeftIcon className="size-3.5" />
      Todo el registro de actividad
    </Link>
  );
}

function DetailField({
  label,
  mono,
  children,
}: {
  label: string;
  mono?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.75">
      <span className="text-2xs text-muted-foreground">{label}</span>
      <span className={cn("text-xs break-words", mono && "font-mono")}>{children}</span>
    </div>
  );
}

function dataType(value: unknown): string {
  return value === null ? "null" : typeof value;
}

function ActivityEvent() {
  const { eventId } = Route.useParams();
  // The loader already returned notFound for a missing entry.
  const entry = useSuspenseQuery(auditEntryQuery(Number(eventId))).data!;
  const { data: keys } = useSuspenseQuery(apiKeysQuery);
  const createdAt = new Date(entry.createdAt);
  const fields = Object.entries(entry.data);
  const keyName =
    entry.actorType === "API_KEY" && entry.actorId
      ? (keys.find((key) => key.id === entry.actorId)?.name ?? "Llave eliminada")
      : null;

  return (
    <>
      <BackToActivity />

      <PageHeader
        title="Detalle del evento"
        lead={`Información del evento #${entry.id}, tal como quedó registrada en el historial.`}
        action={
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <LockKeyholeIcon className="size-3.5" />
            Solo lectura
          </p>
        }
      />

      <section className="rounded-lg border" aria-label="Información del evento">
        <div className="flex items-center justify-between gap-4 border-b p-6">
          <div className="flex flex-col gap-2">
            <h2 className="text-lg">{actionLabel[entry.action]}</h2>
            <code className="text-2xs text-muted-foreground">{entry.action}</code>
          </div>
          <Badge variant="outline">Evento #{entry.id}</Badge>
        </div>
        <div className="grid gap-6 p-6 sm:grid-cols-3 sm:gap-10">
          <DetailField label="Fecha y hora">
            {dayFormat.format(createdAt)}, {timeFormat.format(createdAt)}
          </DetailField>
          <DetailField label="Zona horaria">Colombia (UTC−5)</DetailField>
          <DetailField label="Fecha original" mono>
            {entry.createdAt}
          </DetailField>
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="flex flex-col gap-5.5 rounded-lg border p-6">
          <h2 className="text-[14px] font-medium">Quién realizó la acción</h2>
          <div className="grid grid-cols-2 gap-x-6 gap-y-5.5">
            <DetailField label="Tipo de actor">
              {actorTypeLabel[entry.actorType]} · {entry.actorType}
            </DetailField>
            <DetailField label="Identificador del actor" mono={Boolean(entry.actorId)}>
              {entry.actorId ?? "No registrado"}
            </DetailField>
            {keyName ? (
              <DetailField label="Nombre de la llave">{keyName}</DetailField>
            ) : (
              <DetailField label="Correo electrónico">
                {entry.actorEmail ??
                  (entry.actorType === "USER" ? "Usuario eliminado" : "No registrado")}
              </DetailField>
            )}
            <DetailField label="Dirección IP" mono={Boolean(entry.ipAddress)}>
              {entry.ipAddress ?? "No registrada"}
            </DetailField>
          </div>
          <p className="text-2xs leading-relaxed text-muted-foreground">
            {actorNote[entry.actorType]}
          </p>
        </section>

        <section className="flex flex-col gap-5.5 rounded-lg border p-6">
          <h2 className="text-[14px] font-medium">Recurso asociado</h2>
          <DetailField label="Tipo de recurso" mono={Boolean(entry.resourceType)}>
            {entry.resourceType ?? "No registrado"}
          </DetailField>
          <DetailField label="ID del recurso" mono={Boolean(entry.resourceId)}>
            {entry.resourceId ?? "No registrado"}
          </DetailField>
          <p className="text-2xs leading-relaxed text-muted-foreground">
            {entry.resourceId
              ? "El identificador corresponde al recurso registrado en este evento."
              : "Este evento no tiene un recurso asociado."}
          </p>
        </section>
      </div>

      <section className="flex flex-col gap-4" aria-labelledby="event-data">
        <div className="flex flex-col gap-1.75">
          <div className="flex items-center gap-2.5">
            <h2 id="event-data" className="text-base">
              Datos del evento
            </h2>
            <Badge variant="outline">
              {fields.length} {fields.length === 1 ? "campo" : "campos"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Claves y valores incluidos en este evento. Los campos pueden variar según la acción.
          </p>
        </div>

        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="bg-muted/50 [&_th]:h-9.5">
              <TableRow>
                <TableHead className="px-5">Clave</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead className="w-32.5 pr-5">Tipo de dato</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fields.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                    Este evento no incluye datos.
                  </TableCell>
                </TableRow>
              ) : (
                fields.map(([key, value]) => (
                  <TableRow key={key}>
                    <TableCell className="h-11 px-5 font-mono text-2xs">{key}</TableCell>
                    <TableCell className="text-xs whitespace-normal">
                      {value === null ? (
                        <span className="text-muted-foreground">null · Sin valor</span>
                      ) : (
                        String(value)
                      )}
                    </TableCell>
                    <TableCell className="pr-5 font-mono text-2xs text-muted-foreground">
                      {dataType(value)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      <AuditRecordNotice />
    </>
  );
}

function EventNotFound() {
  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <HistoryIcon />
        </EmptyMedia>
        <EmptyTitle>Evento no encontrado</EmptyTitle>
        <EmptyDescription>
          No existe o no pertenece a esta cuenta. Revisa el enlace o vuelve al registro.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline" render={<Link to="/activity" />} nativeButton={false}>
          Volver al registro de actividad
        </Button>
      </EmptyContent>
    </Empty>
  );
}
