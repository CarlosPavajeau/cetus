import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { PageHeader } from "~/components/PageHeader";
import { Alert, AlertDescription } from "~/components/ui/alert";
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
import { requeueInboundEvent } from "~/features/admin/inboundEvents";
import { adminInboundEventsQuery, adminKey } from "~/features/admin/queries";
import { dayFormat, timeFormat } from "~/features/audit-log/labels";
import type { InboundEvent } from "~/lib/api/types";

export const Route = createFileRoute("/_admin/admin/inbound-events")({
  loader: ({ context: { queryClient } }) =>
    queryClient.query({ ...adminInboundEventsQuery, staleTime: "static" }),
  component: InboundEvents,
});

const providerLabel: Record<InboundEvent["provider"], string> = {
  WOMPI: "Wompi",
  RESEND: "Resend",
};

function dateTime(value: string) {
  const date = new Date(value);
  return `${dayFormat.format(date)}, ${timeFormat.format(date)}`;
}

function InboundEvents() {
  const { platformRole } = Route.useRouteContext();
  const { data: events } = useSuspenseQuery(adminInboundEventsQuery);
  const admin = platformRole === "admin";

  return (
    <>
      <PageHeader
        title="Eventos fallidos"
        lead="Avisos de Wompi y Resend que el worker dejó de reintentar. Corrige la causa antes de volver a encolarlos: cada uno se procesa de nuevo desde el principio."
      />
      {events.length === 0 ? (
        <p className="text-xs text-muted-foreground">No hay eventos fallidos.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Evento</TableHead>
              <TableHead>Recibido</TableHead>
              <TableHead>Intentos</TableHead>
              {admin && <TableHead />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.map((event) => (
              <InboundEventRow key={event.id} event={event} admin={admin} />
            ))}
          </TableBody>
        </Table>
      )}
    </>
  );
}

function InboundEventRow({ event, admin }: { event: InboundEvent; admin: boolean }) {
  const queryClient = useQueryClient();
  const requeue = useMutation({
    mutationFn: requeueInboundEvent,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKey }),
  });

  return (
    <TableRow>
      <TableCell className="align-top whitespace-normal">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-medium">
            {providerLabel[event.provider]} · {event.eventType}
          </span>
          {event.error && (
            <span className="font-mono text-2xs break-all text-muted-foreground">
              {event.error}
            </span>
          )}
          {requeue.isError && (
            <Alert variant="destructive" className="mt-2">
              <AlertDescription>{requeue.error.message}</AlertDescription>
            </Alert>
          )}
        </div>
      </TableCell>
      <TableCell className="align-top text-xs">{dateTime(event.receivedAt)}</TableCell>
      <TableCell className="align-top text-xs tabular-nums">{event.attempts}</TableCell>
      {admin && (
        <TableCell className="align-top">
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="outline"
              disabled={requeue.isPending}
              onClick={() => requeue.mutate({ data: { id: event.id } })}
            >
              {requeue.isPending && <Spinner data-icon="inline-start" />}
              Volver a encolar
            </Button>
          </div>
        </TableCell>
      )}
    </TableRow>
  );
}
