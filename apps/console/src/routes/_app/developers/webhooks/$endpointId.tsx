import { useSuspenseInfiniteQuery, useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { ArrowLeftIcon, CircleAlertIcon, WebhookIcon } from "lucide-react";

import { Entry, Section } from "~/components/DetailSection";
import { EnvironmentBadge } from "~/components/EnvironmentBadge";
import { PageHeader } from "~/components/PageHeader";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty";
import { Spinner } from "~/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { formatDateTime } from "~/features/api-keys/formats";
import { useMemberPermissions } from "~/features/session/useMemberPermissions";
import {
  DisableWebhookEndpoint,
  EnableWebhookEndpoint,
  RetryDelivery,
} from "~/features/webhooks/EndpointActions";
import { deliveryStatusLabel, eventTypeLabel } from "~/features/webhooks/labels";
import { webhookDeliveriesQuery, webhookEndpointQuery } from "~/features/webhooks/queries";
import { WebhookStatusBadge } from "~/features/webhooks/WebhookStatusBadge";
import type { WebhookDelivery, WebhookEndpoint } from "~/lib/api/types";
import { uuidPattern } from "~/lib/utils";

export const Route = createFileRoute("/_app/developers/webhooks/$endpointId")({
  loader: async ({ context: { queryClient }, params }) => {
    if (!uuidPattern.test(params.endpointId)) {
      throw notFound();
    }
    const [endpoint] = await Promise.all([
      queryClient.ensureQueryData(webhookEndpointQuery(params.endpointId)),
      queryClient.ensureInfiniteQueryData(webhookDeliveriesQuery(params.endpointId)),
    ]);
    if (!endpoint) {
      throw notFound();
    }
    return { crumb: new URL(endpoint.url).host };
  },
  component: WebhookEndpointPage,
  notFoundComponent: WebhookEndpointNotFound,
});

function BackToWebhooks() {
  return (
    <Link
      to="/developers/webhooks"
      className="flex w-fit items-center gap-1.75 text-xs text-muted-foreground hover:text-foreground"
    >
      <ArrowLeftIcon className="size-3.5" />
      Todos los webhooks
    </Link>
  );
}

function WebhookEndpointPage() {
  const { endpointId } = Route.useParams();
  // The loader already returned notFound for a missing endpoint.
  const endpoint = useSuspenseQuery(webhookEndpointQuery(endpointId)).data!;
  const { manage } = useMemberPermissions();

  return (
    <div className="flex flex-1 flex-col gap-5">
      <BackToWebhooks />

      <PageHeader
        title={new URL(endpoint.url).host}
        status={<WebhookStatusBadge endpoint={endpoint} />}
        lead={endpoint.description ?? endpoint.url}
        action={
          !manage ? undefined : endpoint.status === "ACTIVE" ? (
            <DisableWebhookEndpoint endpoint={endpoint} />
          ) : (
            <EnableWebhookEndpoint endpoint={endpoint} />
          )
        }
      />

      <EndpointHealth endpoint={endpoint} />

      <Section id="endpoint" title="Configuración">
        <dl className="grid gap-x-10 gap-y-3.25 sm:grid-cols-2 lg:grid-cols-4">
          <Entry label="URL">
            <code>{endpoint.url}</code>
          </Entry>
          <Entry label="Ambiente">
            <EnvironmentBadge environment={endpoint.environment} />
          </Entry>
          <Entry label="Eventos">
            {endpoint.eventTypes.length === 0
              ? "Todos los eventos"
              : endpoint.eventTypes.map(eventTypeLabel).join(", ")}
          </Entry>
          <Entry label="Registrado">{formatDateTime(new Date(endpoint.createdAt))}</Entry>
        </dl>
      </Section>

      <Deliveries endpoint={endpoint} />
    </div>
  );
}

/** Says why the endpoint is disabled, or that it keeps failing and will be disabled. */
function EndpointHealth({ endpoint }: { endpoint: WebhookEndpoint }) {
  if (endpoint.status === "DISABLED") {
    const since = endpoint.disabledAt ? ` el ${formatDateTime(new Date(endpoint.disabledAt))}` : "";
    return endpoint.disabledReason === "AUTOMATIC" ? (
      <Alert variant="destructive">
        <CircleAlertIcon />
        <AlertTitle>Cetus lo desactivó{since} porque llevaba días fallando</AlertTitle>
        <AlertDescription>
          Ningún envío recibió una respuesta 2xx en ese tiempo. Revisa el último error en el
          historial, corrige tu servidor y reactívalo; luego puedes reenviar los eventos cancelados
          uno por uno.
        </AlertDescription>
      </Alert>
    ) : (
      <Alert>
        <AlertTitle>Desactivado{since}</AlertTitle>
        <AlertDescription>Cetus no le envía avisos hasta que lo reactives.</AlertDescription>
      </Alert>
    );
  }
  if (endpoint.consecutiveFailures > 0) {
    return (
      <Alert>
        <CircleAlertIcon />
        <AlertTitle>
          {endpoint.consecutiveFailures === 1
            ? "El último envío falló"
            : `Los últimos ${endpoint.consecutiveFailures} envíos fallaron`}
          {endpoint.consecutiveFailures > 1 &&
            endpoint.failingSince &&
            ` desde el ${formatDateTime(new Date(endpoint.failingSince))}`}
        </AlertTitle>
        <AlertDescription>
          Cetus los reintenta solo. Si sigue fallando durante 3 días, lo desactivará.
        </AlertDescription>
      </Alert>
    );
  }
  return null;
}

function Deliveries({ endpoint }: { endpoint: WebhookEndpoint }) {
  const { data, hasNextPage, fetchNextPage, isFetchingNextPage } = useSuspenseInfiniteQuery(
    webhookDeliveriesQuery(endpoint.id),
  );
  const deliveries = data.pages.flatMap((page) => page.items);

  return (
    <Section id="deliveries" title="Historial de envíos">
      {deliveries.length === 0 ? (
        <p className="text-2xs text-muted-foreground">
          Todavía no hay envíos. Llegarán cuando cambie un documento de este ambiente.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="bg-sidebar [&_th]:h-8.75">
              <TableRow>
                <TableHead className="pl-4">Evento</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Último intento</TableHead>
                <TableHead>Respuesta</TableHead>
                <TableHead className="pr-4" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {deliveries.map((delivery) => (
                <DeliveryRow key={delivery.id} endpoint={endpoint} delivery={delivery} />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {hasNextPage && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
            {isFetchingNextPage && <Spinner data-icon="inline-start" />}
            {isFetchingNextPage ? "Cargando…" : "Ver más"}
          </Button>
        </div>
      )}
      <p className="text-2xs text-muted-foreground">
        Más recientes primero · Horarios de Colombia (UTC−5)
      </p>
    </Section>
  );
}

function DeliveryRow({
  endpoint,
  delivery,
}: {
  endpoint: WebhookEndpoint;
  delivery: WebhookDelivery;
}) {
  const at = delivery.lastAttemptAt ?? delivery.createdAt;
  const { manage } = useMemberPermissions();
  return (
    <TableRow>
      <TableCell className="pl-4 text-2xs">
        <div className="flex flex-col gap-0.5">
          <span className="font-medium">{eventTypeLabel(delivery.eventType)}</span>
          <Link
            to="/documents/$documentId"
            params={{ documentId: delivery.documentId }}
            className="w-fit text-muted-foreground underline-offset-4 hover:underline"
          >
            Ver documento
          </Link>
        </div>
      </TableCell>
      <TableCell className="text-2xs">
        {deliveryStatusLabel[delivery.status]}
        {delivery.attempts > 1 && (
          <span className="text-muted-foreground"> · {delivery.attempts} intentos</span>
        )}
      </TableCell>
      <TableCell className="text-2xs tabular-nums">{formatDateTime(new Date(at))}</TableCell>
      <TableCell className="max-w-72 text-2xs whitespace-normal">
        {delivery.lastResponseStatus != null && (
          <span className="font-medium tabular-nums">HTTP {delivery.lastResponseStatus} </span>
        )}
        <span className="break-words text-muted-foreground">
          {delivery.lastError ?? (delivery.status === "PENDING" ? "En cola" : "")}
        </span>
      </TableCell>
      <TableCell className="pr-4">
        {manage && delivery.status !== "PENDING" && (
          <RetryDelivery endpoint={endpoint} delivery={delivery} />
        )}
      </TableCell>
    </TableRow>
  );
}

function WebhookEndpointNotFound() {
  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <WebhookIcon />
        </EmptyMedia>
        <EmptyTitle>Webhook no encontrado</EmptyTitle>
        <EmptyDescription>
          No existe o no pertenece a esta cuenta. Revisa el enlace o vuelve a tus webhooks.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline" render={<Link to="/developers/webhooks" />} nativeButton={false}>
          Volver a los webhooks
        </Button>
      </EmptyContent>
    </Empty>
  );
}
