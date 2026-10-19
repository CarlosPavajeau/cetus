import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { ArrowLeftIcon, BuildingIcon, FingerprintIcon, PencilIcon } from "lucide-react";

import { CopyButton } from "~/components/CopyButton";
import { Entry, Section } from "~/components/DetailSection";
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
import { dateFormat } from "~/features/api-keys/formats";
import { IssuerStatusBadge } from "~/features/issuers/IssuerStatusBadge";
import { issuerName, personTypeLabel } from "~/features/issuers/labels";
import { PromoteIssuer } from "~/features/issuers/PromoteIssuer";
import { issuerDetailQuery, issuersQuery } from "~/features/issuers/queries";
import { TestSetProgress } from "~/features/issuers/TestSetProgress";
import type { IssuerDetail } from "~/lib/api/types";
import { uuidPattern } from "~/lib/utils";

export const Route = createFileRoute("/_app/issuers/$issuerId")({
  loader: async ({ context: { queryClient }, params }) => {
    if (!uuidPattern.test(params.issuerId)) {
      throw notFound();
    }
    const [issuer] = await Promise.all([
      queryClient.ensureQueryData(issuerDetailQuery(params.issuerId)),
      queryClient.ensureQueryData(issuersQuery),
    ]);
    if (!issuer) {
      throw notFound();
    }
    return { crumb: issuerName(issuer) };
  },
  component: IssuerDetailPage,
  notFoundComponent: IssuerNotFound,
});

const countFormat = new Intl.NumberFormat("es-CO");

const statusLead: Record<IssuerDetail["status"], string> = {
  ONBOARDING: "Le faltan pasos de configuración antes de poder facturar.",
  TESTING: "Listo para enviar facturas a la habilitación de la DIAN con una llave de pruebas.",
  ENABLED: "Habilitado para emitir facturas con validez fiscal con una llave de producción.",
  DISABLED: "Deshabilitado: la API rechaza sus facturas.",
};

/** A LocalDate ("2026-10-18") read as a calendar day, not as midnight UTC. */
function formatDay(day: string) {
  return dateFormat.format(new Date(`${day}T12:00:00-05:00`));
}

function BackToIssuers() {
  return (
    <Link
      to="/issuers"
      className="flex w-fit items-center gap-1.75 text-xs text-muted-foreground hover:text-foreground"
    >
      <ArrowLeftIcon className="size-3.5" />
      Todos los emisores
    </Link>
  );
}

function invoiceExample(issuerId: string) {
  return `curl -X POST "$CETUS_API_URL/v1/invoices" \\
  -H "Authorization: Bearer $CETUS_API_KEY" \\
  -H "Idempotency-Key: $(uuidgen)" \\
  -H "Content-Type: application/json" \\
  -d '{
    "issuerId": "${issuerId}",
    "customer": { … },
    "payment": { … },
    "lines": [ … ]
  }'`;
}

function IssuerDetailPage() {
  const { issuerId } = Route.useParams();
  // The loader already returned notFound for a missing issuer.
  const issuer = useSuspenseQuery(issuerDetailQuery(issuerId)).data!;
  const { data: issuers } = useSuspenseQuery(issuersQuery);
  // The same NIT in the other environment: the production issuer of a test one, or the other way round.
  const counterpart = issuers.find(
    (other) => other.nit === issuer.nit && other.environment !== issuer.environment,
  );
  const example = invoiceExample(issuer.id);
  const keyKind = issuer.environment === "TEST" ? "de pruebas" : "de producción";

  return (
    <div className="flex flex-1 flex-col gap-5">
      <BackToIssuers />

      <PageHeader
        title={issuerName(issuer)}
        status={<IssuerStatusBadge status={issuer.status} />}
        lead={statusLead[issuer.status]}
        action={
          issuer.status === "ONBOARDING" ? (
            <Button
              render={<Link to="/setup" search={{ issuerId: issuer.id }} />}
              nativeButton={false}
            >
              Continuar configuración
            </Button>
          ) : (
            issuer.environment === "TEST" &&
            issuer.status === "TESTING" &&
            !counterpart && <PromoteIssuer issuer={issuer} />
          )
        }
      />

      {counterpart && (
        <p className="text-2xs text-muted-foreground">
          {counterpart.environment === "LIVE"
            ? "Este NIT ya tiene su emisor de producción: "
            : "Este emisor viene de la habilitación en pruebas: "}
          <Link
            to="/issuers/$issuerId"
            params={{ issuerId: counterpart.id }}
            className="underline underline-offset-4 hover:text-foreground"
          >
            ver emisor de {counterpart.environment === "LIVE" ? "producción" : "pruebas"}
          </Link>
          .
        </p>
      )}

      <section
        className="flex min-h-16 flex-wrap items-center justify-between gap-x-6 gap-y-2 rounded-md border bg-card px-5 py-3"
        aria-label="ID del emisor"
      >
        <div className="flex min-w-0 items-center gap-3.5">
          <FingerprintIcon className="size-4 shrink-0" />
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-2xs text-muted-foreground">ID para la API</span>
            <div className="flex min-w-0 items-center gap-2">
              <code className="truncate text-sm" data-testid="issuer-id">
                {issuer.id}
              </code>
              <EnvironmentBadge environment={issuer.environment} />
            </div>
          </div>
        </div>
        <CopyButton value={issuer.id} label="Copiar ID del emisor" />
      </section>

      <p className="text-2xs text-muted-foreground">
        <Link
          to="/documents"
          search={{ issuerId: issuer.id }}
          className="underline underline-offset-4 hover:text-foreground"
        >
          Ver los documentos de este emisor
        </Link>
      </p>

      {issuer.testSet && (
        <Section id="test-set" title="Avance del set de pruebas">
          <TestSetProgress testSet={issuer.testSet} />
        </Section>
      )}

      <Section id="integration" title="Facturar por este emisor">
        <p className="text-2xs text-muted-foreground">
          Envía este ID como <code>issuerId</code> en <code>POST /v1/invoices</code> con una{" "}
          <Link to="/developers/api-keys" className="underline underline-offset-4">
            llave {keyKind}
          </Link>
          . Cualquier llave {keyKind} de la cuenta puede facturar por él.
        </p>
        <div className="relative">
          <pre className="overflow-x-auto rounded-md bg-muted p-4 text-2xs leading-relaxed">
            <code>{example}</code>
          </pre>
          <div className="absolute top-2 right-2">
            <CopyButton value={example} label="Copiar ejemplo" iconOnly />
          </div>
        </div>
      </Section>

      <Section
        id="tax-data"
        title="Datos tributarios"
        action={
          <Button
            variant="outline"
            size="sm"
            render={<Link to="/issuers/$issuerId/edit" params={{ issuerId: issuer.id }} />}
            nativeButton={false}
          >
            <PencilIcon data-icon="inline-start" />
            Editar
          </Button>
        }
      >
        <dl className="grid gap-x-10 gap-y-3.25 sm:grid-cols-2 lg:grid-cols-4">
          <Entry label="Nombre o razón social">{issuer.legalName}</Entry>
          <Entry label="Nombre comercial">{issuer.tradeName ?? "—"}</Entry>
          <Entry label="NIT">
            {issuer.nit}-{issuer.checkDigit}
          </Entry>
          <Entry label="Tipo de persona">{personTypeLabel[issuer.personType]}</Entry>
          <Entry label="Responsabilidades tributarias">{issuer.taxLevelCodes.join(", ")}</Entry>
          <Entry label="Responsable de IVA">{issuer.responsibleForIva ? "Sí" : "No"}</Entry>
          <Entry label="Dirección">
            {issuer.address.line}, {issuer.address.cityName}, {issuer.address.departmentName}
          </Entry>
          <Entry label="Contacto">
            {issuer.email}
            {issuer.phone && ` · ${issuer.phone}`}
          </Entry>
        </dl>
      </Section>

      <Section id="dian" title="Configuración DIAN">
        <dl className="grid gap-x-10 gap-y-3.25 sm:grid-cols-2 lg:grid-cols-4">
          <Entry label="Software ID">{issuer.software?.softwareId ?? "Pendiente"}</Entry>
          {issuer.environment === "TEST" && (
            <Entry label="Set de pruebas">{issuer.software?.testSetId ?? "—"}</Entry>
          )}
          <Entry label="Certificado de firma">{issuer.certificate?.subject ?? "Pendiente"}</Entry>
          {issuer.certificate && (
            <Entry label="Vigencia del certificado">
              Hasta el {dateFormat.format(new Date(issuer.certificate.validTo))}
            </Entry>
          )}
        </dl>

        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="bg-sidebar [&_th]:h-8.75">
              <TableRow>
                <TableHead className="pl-4">Prefijo</TableHead>
                <TableHead>Rango</TableHead>
                <TableHead>Siguiente número</TableHead>
                <TableHead>Vigente hasta</TableHead>
                <TableHead className="pr-4">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {issuer.ranges.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-16 text-center text-muted-foreground">
                    Todavía no hay rangos de numeración.
                  </TableCell>
                </TableRow>
              ) : (
                issuer.ranges.map((range) => (
                  <TableRow key={range.id}>
                    <TableCell className="pl-4 text-2xs font-medium">
                      {range.prefix || "Sin prefijo"}
                    </TableCell>
                    <TableCell className="text-2xs tabular-nums">
                      {countFormat.format(range.from)} – {countFormat.format(range.to)}
                    </TableCell>
                    <TableCell className="text-2xs tabular-nums">
                      {countFormat.format(range.nextNumber)}
                    </TableCell>
                    <TableCell className="text-2xs">
                      {range.validTo ? formatDay(range.validTo) : "—"}
                    </TableCell>
                    <TableCell className="pr-4 text-2xs">
                      {range.status === "ACTIVE" ? "Activo" : "Inactivo"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Section>

      <p className="mt-auto text-2xs text-muted-foreground">
        Los cambios en este emisor se registran en la{" "}
        <Link to="/activity" className="underline underline-offset-4 hover:text-foreground">
          actividad
        </Link>
        .
      </p>
    </div>
  );
}

function IssuerNotFound() {
  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <BuildingIcon />
        </EmptyMedia>
        <EmptyTitle>Emisor no encontrado</EmptyTitle>
        <EmptyDescription>
          No existe o no pertenece a esta cuenta. Revisa el enlace o vuelve a tus emisores.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline" render={<Link to="/issuers" />} nativeButton={false}>
          Volver a los emisores
        </Button>
      </EmptyContent>
    </Empty>
  );
}
