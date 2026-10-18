import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { ArrowLeftIcon, BanIcon, KeyRoundIcon, LockKeyholeIcon } from "lucide-react";
import type { ReactNode } from "react";

import { EnvironmentBadge } from "~/components/EnvironmentBadge";
import { PageHeader } from "~/components/PageHeader";
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
import { ApiKeyStatusBadge } from "~/features/api-keys/ApiKeyStatusBadge";
import {
  formatDateTime,
  formatRecentDateTime,
  formatRequestTime,
} from "~/features/api-keys/formats";
import { apiKeyQuery } from "~/features/api-keys/queries";
import { statusLabel } from "~/features/api-keys/requests";
import { RevokeApiKey } from "~/features/api-keys/RevokeApiKey";
import type { ApiKeyRequest } from "~/lib/api/types";
import { cn } from "~/lib/utils";

export const Route = createFileRoute("/_app/developers/api-keys/$keyId")({
  loader: async ({ context: { queryClient }, params }) => {
    if (!uuidPattern.test(params.keyId)) {
      throw notFound();
    }
    const detail = await queryClient.ensureQueryData(apiKeyQuery(params.keyId));
    if (!detail) {
      throw notFound();
    }
    return { crumb: detail.key.name };
  },
  component: ApiKeyDetail,
  notFoundComponent: ApiKeyNotFound,
});

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const countFormat = new Intl.NumberFormat("es-CO");

const environmentLead = {
  LIVE: "Llave de producción: emite documentos con validez fiscal ante la DIAN.",
  TEST: "Llave de pruebas: envía a la habilitación de la DIAN, sin validez fiscal.",
} as const;

function BackToKeys() {
  return (
    <Link
      to="/developers/api-keys"
      className="flex w-fit items-center gap-1.75 text-xs text-muted-foreground hover:text-foreground"
    >
      <ArrowLeftIcon className="size-3.5" />
      Todas las llaves de API
    </Link>
  );
}

function ConfigurationEntry({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="text-2xs text-muted-foreground">{label}</dt>
      <dd className="text-2xs break-words">{children}</dd>
    </div>
  );
}

function ApiKeyDetail() {
  const { keyId } = Route.useParams();
  // The loader already returned notFound for a missing key.
  const detail = useSuspenseQuery(apiKeyQuery(keyId)).data!;
  const { key, recentRequests, requestsLast24Hours } = detail;
  const revokedAt = key.revokedAt ? new Date(key.revokedAt) : null;

  return (
    <div className="flex flex-1 flex-col gap-5">
      <BackToKeys />

      <PageHeader
        title={key.name}
        status={<ApiKeyStatusBadge apiKey={key} />}
        lead={environmentLead[key.environment]}
      />

      <section
        className="flex min-h-16 flex-wrap items-center justify-between gap-x-6 gap-y-2 rounded-md border bg-card px-5 py-3"
        aria-label="Llave"
      >
        <div className="flex min-w-0 items-center gap-3.5">
          <KeyRoundIcon className="size-4 shrink-0" />
          <span className="truncate text-sm">{key.prefix}••••••••••••••••</span>
          <EnvironmentBadge environment={key.environment} />
        </div>
        <p className="flex items-center gap-1.75 text-2xs text-muted-foreground">
          <LockKeyholeIcon className="size-3.25" />
          La llave completa solo se muestra al crearla.
        </p>
      </section>

      <section
        className="flex flex-col gap-4 rounded-lg border p-5"
        aria-labelledby="configuration"
      >
        <h2 id="configuration" className="text-[14px] font-medium">
          Configuración
        </h2>
        <dl className="grid gap-x-10 gap-y-3.25 sm:grid-cols-2 lg:grid-cols-4">
          <ConfigurationEntry label="Creada por">
            {detail.createdByName ?? (key.createdBy ? "Usuario eliminado" : "No registrado")}
          </ConfigurationEntry>
          <ConfigurationEntry label="Fecha de creación">
            {formatDateTime(new Date(key.createdAt))}
          </ConfigurationEntry>
          <ConfigurationEntry label="Último uso">
            <span suppressHydrationWarning>
              {key.lastUsedAt ? formatRecentDateTime(new Date(key.lastUsedAt)) : "Nunca"}
            </span>
          </ConfigurationEntry>
          {revokedAt && (
            <ConfigurationEntry label="Revocada">
              <span suppressHydrationWarning>{formatRecentDateTime(revokedAt)}</span>
            </ConfigurationEntry>
          )}
        </dl>
      </section>

      <section className="flex flex-col gap-3.25" aria-labelledby="usage">
        <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1">
          <h2 id="usage" className="text-[14px] font-medium">
            Uso reciente
          </h2>
          <p className="text-2xs text-muted-foreground">
            {countFormat.format(requestsLast24Hours)}{" "}
            {requestsLast24Hours === 1 ? "solicitud" : "solicitudes"} en las últimas 24 horas
          </p>
        </div>

        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="bg-sidebar [&_th]:h-8.75">
              <TableRow>
                <TableHead className="w-25 pl-4">Hora</TableHead>
                <TableHead className="w-16.25">Método</TableHead>
                <TableHead>Endpoint</TableHead>
                <TableHead className="w-27.5">Respuesta</TableHead>
                <TableHead className="w-22.5">Duración</TableHead>
                <TableHead className="w-27.5 pr-4">ID de solicitud</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    Todavía no hay solicitudes con esta llave.
                  </TableCell>
                </TableRow>
              ) : (
                recentRequests.map((request) => <RequestRow key={request.id} request={request} />)
              )}
            </TableBody>
          </Table>
        </div>

        <p className="text-[10px] leading-normal text-muted-foreground">
          Solicitudes a la API, no documentos validados por la DIAN. Horarios de Colombia (UTC−5).
        </p>
      </section>

      {!revokedAt && (
        <section
          className="mt-auto flex flex-col gap-4 border-t pt-4 sm:flex-row sm:items-center sm:justify-between"
          aria-labelledby="revocation"
        >
          <div className="flex flex-col gap-0.5">
            <h2 id="revocation" className="text-xs font-medium">
              ¿Esta integración ya no necesita acceso?
            </h2>
            <p className="text-2xs text-muted-foreground">
              Revocar la llave bloqueará de inmediato todas las solicitudes que la utilicen.
            </p>
          </div>
          <RevokeApiKey apiKey={key} size="default">
            <BanIcon data-icon="inline-start" />
            Revocar llave
          </RevokeApiKey>
        </section>
      )}
    </div>
  );
}

function RequestRow({ request }: { request: ApiKeyRequest }) {
  const failed = request.status >= 400;

  return (
    <TableRow>
      <TableCell className="h-11 pl-4 text-2xs text-muted-foreground tabular-nums">
        <span suppressHydrationWarning>{formatRequestTime(new Date(request.createdAt))}</span>
      </TableCell>
      <TableCell className="text-[10px] leading-normal font-medium">{request.method}</TableCell>
      <TableCell className="max-w-0 truncate text-2xs text-muted-foreground">
        {request.path}
      </TableCell>
      <TableCell className={cn("text-2xs", failed && "text-destructive")}>
        {statusLabel(request.status)}
      </TableCell>
      <TableCell className="text-2xs text-muted-foreground tabular-nums">
        {countFormat.format(request.durationMs)} ms
      </TableCell>
      {/* The tail tells requests apart: the head of a UUID v7 is its timestamp. */}
      <TableCell
        className="pr-4 text-[10px] leading-normal text-muted-foreground"
        title={request.id}
      >
        …{request.id.slice(-8)}
      </TableCell>
    </TableRow>
  );
}

function ApiKeyNotFound() {
  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <KeyRoundIcon />
        </EmptyMedia>
        <EmptyTitle>Llave no encontrada</EmptyTitle>
        <EmptyDescription>
          No existe o no pertenece a esta cuenta. Revisa el enlace o vuelve a tus llaves.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline" render={<Link to="/developers/api-keys" />} nativeButton={false}>
          Volver a las llaves de API
        </Button>
      </EmptyContent>
    </Empty>
  );
}
