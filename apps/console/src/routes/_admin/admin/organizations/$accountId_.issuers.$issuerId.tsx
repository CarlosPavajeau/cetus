import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { ArrowLeftIcon } from "lucide-react";

import { Entry, Section } from "~/components/DetailSection";
import { EnvironmentBadge } from "~/components/EnvironmentBadge";
import { PageHeader } from "~/components/PageHeader";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { CertificateLink, RangeDialog, SoftwareDialog } from "~/features/admin/AssistedSetup";
import { adminIssuerQuery } from "~/features/admin/queries";
import { dayFormat } from "~/features/audit-log/labels";
import { IssuerStatusBadge } from "~/features/issuers/IssuerStatusBadge";
import { issuerName } from "~/features/issuers/labels";

/**
 * An issuer seen by the Cetus team, with the setup steps it can do for the customer. The certificate
 * comes from the customer, through a one-time link.
 */
export const Route = createFileRoute("/_admin/admin/organizations/$accountId_/issuers/$issuerId")({
  loader: async ({ context: { queryClient }, params }) => {
    const issuer = await queryClient.query({
      ...adminIssuerQuery(params.accountId, params.issuerId),
      staleTime: "static",
    });
    if (!issuer) {
      throw notFound();
    }
    return { crumb: issuerName(issuer) };
  },
  component: AdminIssuer,
  notFoundComponent: () => (
    <p className="text-sm text-muted-foreground">
      Esta cuenta no tiene un emisor con ese identificador.
    </p>
  ),
});

function AdminIssuer() {
  const ids = Route.useParams();
  const issuer = useSuspenseQuery(adminIssuerQuery(ids.accountId, ids.issuerId)).data;
  if (!issuer) {
    throw notFound();
  }

  return (
    <>
      <Link
        to="/admin/organizations/$accountId"
        params={{ accountId: ids.accountId }}
        className="flex w-fit items-center gap-1.75 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-3.5" />
        Volver a la organización
      </Link>
      <PageHeader
        title={issuerName(issuer)}
        status={
          <>
            <EnvironmentBadge environment={issuer.environment} />
            <IssuerStatusBadge status={issuer.status} />
          </>
        }
        lead={`NIT ${issuer.nit}-${issuer.checkDigit} · ${issuer.email}`}
      />

      <Section
        id="issuer-software"
        title="Software de la DIAN"
        action={<SoftwareDialog ids={ids} issuer={issuer} />}
      >
        {issuer.software ? (
          <dl className="grid gap-4 sm:grid-cols-2">
            <Entry label="Software ID">
              <code>{issuer.software.softwareId}</code>
            </Entry>
            <Entry label="TestSetId">
              {issuer.software.testSetId ? (
                <code>{issuer.software.testSetId}</code>
              ) : (
                "Sin set de pruebas"
              )}
            </Entry>
          </dl>
        ) : (
          <p className="text-xs text-muted-foreground">Sin configurar.</p>
        )}
      </Section>

      <Section id="issuer-certificate" title="Certificado de firma">
        {issuer.certificate ? (
          <dl className="grid gap-4 sm:grid-cols-3">
            <Entry label="Titular">{issuer.certificate.subject}</Entry>
            <Entry label="Serie">{issuer.certificate.serialNumber}</Entry>
            <Entry label="Vigencia">
              {dayFormat.format(new Date(issuer.certificate.validFrom))} al{" "}
              {dayFormat.format(new Date(issuer.certificate.validTo))}
            </Entry>
          </dl>
        ) : (
          <p className="text-xs text-muted-foreground">Sin certificado.</p>
        )}
        <p className="text-2xs text-muted-foreground">
          El certificado y su contraseña los carga el cliente. Genera un enlace de un solo uso y
          envíaselo; nadie puede descargar el certificado desde Cetus.
        </p>
        <CertificateLink ids={ids} />
      </Section>

      <Section
        id="issuer-ranges"
        title={`Rangos de numeración (${issuer.ranges.length})`}
        action={<RangeDialog ids={ids} issuer={issuer} />}
      >
        {issuer.ranges.length === 0 ? (
          <p className="text-xs text-muted-foreground">Sin rangos.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rango</TableHead>
                <TableHead>Siguiente</TableHead>
                <TableHead>Vigente hasta</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {issuer.ranges.map((range) => (
                <TableRow key={range.id}>
                  <TableCell className="text-xs tabular-nums">
                    {range.prefix}
                    {range.from} – {range.prefix}
                    {range.to}
                  </TableCell>
                  <TableCell className="text-xs tabular-nums">{range.nextNumber}</TableCell>
                  <TableCell className="text-xs">
                    {range.validTo ? dayFormat.format(new Date(`${range.validTo}T12:00:00`)) : "—"}
                  </TableCell>
                  <TableCell className="text-xs">{range.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Section>
    </>
  );
}
