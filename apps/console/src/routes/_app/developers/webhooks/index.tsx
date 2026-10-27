import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { WebhookIcon } from "lucide-react";
import { useState } from "react";

import { EnvironmentBadge } from "~/components/EnvironmentBadge";
import { PageHeader } from "~/components/PageHeader";
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
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { ReadOnlyNotice } from "~/features/session/ReadOnlyNotice";
import { useMemberPermissions } from "~/features/session/useMemberPermissions";
import { CreateWebhookEndpoint } from "~/features/webhooks/CreateWebhookEndpoint";
import { eventTypesSummary } from "~/features/webhooks/labels";
import { webhookEndpointsQuery, webhookEventTypesQuery } from "~/features/webhooks/queries";
import { WebhookStatusBadge } from "~/features/webhooks/WebhookStatusBadge";
import { type Environment, type WebhookEndpoint, environments } from "~/lib/api/types";

export const Route = createFileRoute("/_app/developers/webhooks/")({
  loader: ({ context: { queryClient } }) =>
    Promise.all([
      queryClient.ensureQueryData(webhookEndpointsQuery),
      queryClient.ensureQueryData(webhookEventTypesQuery),
    ]),
  component: Webhooks,
});

const environmentFilters = ["ALL", ...environments] as const;

type EnvironmentFilter = (typeof environmentFilters)[number];

function Webhooks() {
  const { data: endpoints } = useSuspenseQuery(webhookEndpointsQuery);
  const { manage } = useMemberPermissions();
  const [environment, setEnvironment] = useState<EnvironmentFilter>("ALL");
  const visible = endpoints.filter(
    (endpoint) => environment === "ALL" || endpoint.environment === environment,
  );
  const count = (value: Environment) =>
    endpoints.filter((endpoint) => endpoint.environment === value).length;

  return (
    <>
      <PageHeader
        title="Webhooks"
        count={endpoints.length}
        lead="URLs de tus sistemas que reciben un aviso firmado cuando cambia uno de tus documentos."
        action={manage ? <CreateWebhookEndpoint /> : undefined}
      />
      <ReadOnlyNotice>
        Los webhooks los registran, desactivan y reintentan los dueños y administradores de la
        organización.
      </ReadOnlyNotice>

      {endpoints.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <WebhookIcon />
            </EmptyMedia>
            <EmptyTitle>Aún no tienes webhooks</EmptyTitle>
            <EmptyDescription>
              Con un webhook, tu sistema se entera de que la DIAN aceptó o rechazó un documento, o
              de que el cliente lo recibió, sin consultar la API una y otra vez.
            </EmptyDescription>
          </EmptyHeader>
          {manage && (
            <EmptyContent>
              <CreateWebhookEndpoint />
            </EmptyContent>
          )}
        </Empty>
      ) : (
        <section className="flex flex-col gap-4" aria-label="Tus webhooks">
          <Tabs
            value={environment}
            onValueChange={(value) => {
              const next = environmentFilters.find((each) => each === value);
              if (next) {
                setEnvironment(next);
              }
            }}
          >
            <TabsList className="gap-0.75">
              <TabsTrigger value="ALL">
                Todos <span className="text-muted-foreground">{endpoints.length}</span>
              </TabsTrigger>
              <TabsTrigger value="LIVE">
                Producción <span className="text-muted-foreground">{count("LIVE")}</span>
              </TabsTrigger>
              <TabsTrigger value="TEST">
                Pruebas <span className="text-muted-foreground">{count("TEST")}</span>
              </TabsTrigger>
              <TabsTrigger value="SANDBOX">
                Simulación <span className="text-muted-foreground">{count("SANDBOX")}</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader className="bg-muted/50 [&_th]:h-11">
                <TableRow>
                  <TableHead className="px-5">URL</TableHead>
                  <TableHead>Eventos</TableHead>
                  <TableHead>Ambiente</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="pr-5 text-right">Fallas seguidas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      No hay webhooks en este ambiente.
                    </TableCell>
                  </TableRow>
                ) : (
                  visible.map((endpoint) => <EndpointRow key={endpoint.id} endpoint={endpoint} />)
                )}
              </TableBody>
            </Table>
          </div>
        </section>
      )}

      <p className="mt-auto text-2xs text-muted-foreground">
        Cada envío lleva las cabeceras <code>webhook-id</code>, <code>webhook-timestamp</code> y{" "}
        <code>webhook-signature</code> del estándar Standard Webhooks. Responde con un código 2xx
        para confirmarlo; si no, Cetus lo reintenta durante varias horas.
      </p>
    </>
  );
}

function EndpointRow({ endpoint }: { endpoint: WebhookEndpoint }) {
  return (
    <TableRow>
      <TableCell className="max-w-96 px-5 py-5">
        <div className="flex flex-col gap-0.75">
          <Link
            to="/developers/webhooks/$endpointId"
            params={{ endpointId: endpoint.id }}
            className="w-fit truncate font-medium hover:underline hover:underline-offset-4"
            title={endpoint.url}
          >
            {endpoint.url}
          </Link>
          {endpoint.description && (
            <span className="truncate text-2xs text-muted-foreground">{endpoint.description}</span>
          )}
        </div>
      </TableCell>
      <TableCell className="text-xs">{eventTypesSummary(endpoint.eventTypes)}</TableCell>
      <TableCell>
        <EnvironmentBadge environment={endpoint.environment} />
      </TableCell>
      <TableCell>
        <WebhookStatusBadge endpoint={endpoint} />
      </TableCell>
      <TableCell className="pr-5 text-right text-xs tabular-nums">
        {endpoint.consecutiveFailures}
      </TableCell>
    </TableRow>
  );
}
