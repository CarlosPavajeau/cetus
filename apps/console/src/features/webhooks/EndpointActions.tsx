import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PowerIcon, PowerOffIcon, RotateCwIcon } from "lucide-react";
import { useState } from "react";

import { Alert, AlertDescription } from "~/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Field, FieldLabel } from "~/components/ui/field";
import { Spinner } from "~/components/ui/spinner";
import { auditLogKey } from "~/features/audit-log/queries";
import type { WebhookDelivery, WebhookEndpoint } from "~/lib/api/types";

import { webhookEndpointsQuery } from "./queries";
import { disableWebhookEndpoint, enableWebhookEndpoint, retryWebhookDelivery } from "./server";

/** Refetches the endpoints, the open detail and its deliveries, and the audit log that records each change. */
function useInvalidateWebhooks() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: webhookEndpointsQuery.queryKey }),
      queryClient.invalidateQueries({ queryKey: auditLogKey }),
    ]);
}

export function DisableWebhookEndpoint({ endpoint }: { endpoint: WebhookEndpoint }) {
  const [open, setOpen] = useState(false);
  const invalidate = useInvalidateWebhooks();
  const disable = useMutation({
    mutationFn: disableWebhookEndpoint,
    onSuccess: async () => {
      await invalidate();
      setOpen(false);
    },
  });

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        disable.reset();
      }}
    >
      <AlertDialogTrigger render={<Button variant="outline" />}>
        <PowerOffIcon data-icon="inline-start" />
        Desactivar
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Desactivar este webhook?</AlertDialogTitle>
          <AlertDialogDescription>
            Cetus dejará de enviar avisos a {endpoint.url}. Los envíos pendientes se cancelan.
            Puedes reactivarlo cuando quieras.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {disable.error && (
          <Alert variant="destructive">
            <AlertDescription>No pudimos desactivarlo. Inténtalo de nuevo.</AlertDescription>
          </Alert>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={disable.isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => disable.mutate({ data: { id: endpoint.id } })}
            disabled={disable.isPending}
          >
            {disable.isPending && <Spinner data-icon="inline-start" />}
            Desactivar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function EnableWebhookEndpoint({ endpoint }: { endpoint: WebhookEndpoint }) {
  const [open, setOpen] = useState(false);
  const [redeliver, setRedeliver] = useState(true);
  const invalidate = useInvalidateWebhooks();
  const enable = useMutation({
    mutationFn: enableWebhookEndpoint,
    onSuccess: async () => {
      await invalidate();
      setOpen(false);
    },
  });
  const missed = endpoint.missedEvents ?? 0;

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        setRedeliver(true);
        enable.reset();
      }}
    >
      <AlertDialogTrigger render={<Button />}>
        <PowerIcon data-icon="inline-start" />
        Reactivar
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Reactivar este webhook?</AlertDialogTitle>
          <AlertDialogDescription>
            Cetus volverá a enviar los eventos nuevos a {endpoint.url} y el conteo de fallas empieza
            de cero.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {/* Always offered: the count was read when the page loaded, and events may have arrived since. */}
        <Field orientation="horizontal">
          <Checkbox
            id="webhook-redeliver"
            checked={redeliver}
            onCheckedChange={(checked) => setRedeliver(checked)}
          />
          <FieldLabel htmlFor="webhook-redeliver" className="font-normal">
            {missed === 1
              ? "Reenviar el evento que no recibió mientras fallaba o estaba desactivado"
              : missed > 1
                ? `Reenviar los ${missed.toLocaleString("es-CO")} eventos que no recibió mientras fallaba o estaba desactivado`
                : "Reenviar los eventos que no recibió mientras fallaba o estaba desactivado"}
          </FieldLabel>
        </Field>
        {enable.error && (
          <Alert variant="destructive">
            <AlertDescription>No pudimos reactivarlo. Inténtalo de nuevo.</AlertDescription>
          </Alert>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={enable.isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => enable.mutate({ data: { id: endpoint.id, redeliver } })}
            disabled={enable.isPending}
          >
            {enable.isPending && <Spinner data-icon="inline-start" />}
            Reactivar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Sends one event again, with the same id and body. */
export function RetryDelivery({
  endpoint,
  delivery,
}: {
  endpoint: WebhookEndpoint;
  delivery: WebhookDelivery;
}) {
  const invalidate = useInvalidateWebhooks();
  const retry = useMutation({
    mutationFn: retryWebhookDelivery,
    onSuccess: async (result) => {
      if (result.ok) {
        await invalidate();
      }
    },
  });
  const message =
    retry.data && !retry.data.ok
      ? retry.data.message
      : retry.isError
        ? "No pudimos reenviarlo."
        : null;

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="ghost"
        size="sm"
        disabled={retry.isPending || endpoint.status !== "ACTIVE"}
        onClick={() => retry.mutate({ data: { id: endpoint.id, deliveryId: delivery.id } })}
      >
        {retry.isPending ? (
          <Spinner data-icon="inline-start" />
        ) : (
          <RotateCwIcon data-icon="inline-start" />
        )}
        Reenviar
      </Button>
      {message && <output className="text-2xs text-muted-foreground">{message}</output>}
    </div>
  );
}
