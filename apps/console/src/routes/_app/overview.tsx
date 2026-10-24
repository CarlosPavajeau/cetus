import { useSuspenseInfiniteQuery, useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { BuildingIcon, FileTextIcon } from "lucide-react";

import { EnvironmentBadge } from "~/components/EnvironmentBadge";
import { PageHeader } from "~/components/PageHeader";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
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
import { accountQuery } from "~/features/account/queries";
import { documentsQuery } from "~/features/documents/queries";
import { useActiveEnvironment } from "~/features/environment/queries";
import { issuerName, statusLabel } from "~/features/issuers/labels";
import { issuersQuery } from "~/features/issuers/queries";
import { useMemberPermissions } from "~/features/session/useMemberPermissions";

export const Route = createFileRoute("/_app/overview")({
  loader: ({ context: { queryClient } }) =>
    Promise.all([
      queryClient.ensureQueryData(accountQuery),
      queryClient.ensureQueryData(issuersQuery),
      queryClient.ensureInfiniteQueryData(documentsQuery({ environment: "SANDBOX" })),
    ]),
  component: Overview,
});

function Overview() {
  const { data: account } = useSuspenseQuery(accountQuery);
  const { data: issuers } = useSuspenseQuery(issuersQuery);
  const { data: sandboxDocuments } = useSuspenseInfiniteQuery(
    documentsQuery({ environment: "SANDBOX" }),
  );
  const environment = useActiveEnvironment();
  const { manage } = useMemberPermissions();
  // A new organization only has the sandbox sample, which needs no setup.
  const fiscal = issuers.some((issuer) => issuer.environment !== "SANDBOX");
  const tried = sandboxDocuments.pages.some((page) => page.items.length > 0);

  return (
    <>
      <PageHeader
        title={account.name}
        lead={`Plan ${account.plan.toLowerCase()} · cuenta ${account.status.toLowerCase()}`}
      />

      {environment === "SANDBOX" && !tried && (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileTextIcon />
            </EmptyMedia>
            <EmptyTitle>Emite tu primera factura de prueba</EmptyTitle>
            <EmptyDescription>
              Ya tienes un emisor de ejemplo listo. Emite una factura simulada y mira su ciclo
              completo: el estado ante la DIAN, el PDF y el XML. No tiene validez fiscal.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button render={<Link to="/documents/new" />} nativeButton={false}>
              Emitir factura de prueba
            </Button>
          </EmptyContent>
        </Empty>
      )}

      {!fiscal && manage && (
        <Card>
          <CardHeader>
            <CardTitle>Factura con validez fiscal</CardTitle>
            <CardDescription>
              Cuando quieras facturar ante la DIAN, configura tu empresa: su NIT, el software
              registrado en la DIAN, el certificado de firma y la resolución de numeración. El
              asistente te guía paso a paso.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button variant="outline" render={<Link to="/setup" />} nativeButton={false}>
              Configurar emisor
            </Button>
          </CardFooter>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Emisores</CardTitle>
          <CardDescription>Las empresas que facturan desde esta cuenta.</CardDescription>
        </CardHeader>
        <CardContent>
          {issuers.length === 0 ? (
            <Empty className="border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <BuildingIcon />
                </EmptyMedia>
                <EmptyTitle>Aún no tienes emisores</EmptyTitle>
                <EmptyDescription>
                  Un emisor es la empresa que factura: su NIT, su certificado de firma y su
                  resolución de numeración. El asistente te guía para configurarlo.
                </EmptyDescription>
              </EmptyHeader>
              {manage && (
                <EmptyContent>
                  <Button render={<Link to="/setup" />} nativeButton={false}>
                    Configurar emisor
                  </Button>
                </EmptyContent>
              )}
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Razón social</TableHead>
                  <TableHead>NIT</TableHead>
                  <TableHead>Ambiente</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {issuers.map((issuer) => (
                  <TableRow key={issuer.id}>
                    <TableCell>
                      <Link
                        to="/issuers/$issuerId"
                        params={{ issuerId: issuer.id }}
                        className="hover:underline hover:underline-offset-4"
                      >
                        {issuerName(issuer)}
                      </Link>
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {issuer.nit}-{issuer.checkDigit}
                    </TableCell>
                    <TableCell>
                      <EnvironmentBadge environment={issuer.environment} />
                    </TableCell>
                    <TableCell>
                      {manage && issuer.status === "ONBOARDING" ? (
                        <Button
                          variant="link"
                          size="sm"
                          className="h-auto px-0"
                          render={<Link to="/setup" search={{ issuerId: issuer.id }} />}
                          nativeButton={false}
                        >
                          Continuar configuración
                        </Button>
                      ) : (
                        statusLabel[issuer.status]
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Integra tu sistema</CardTitle>
          <CardDescription>
            Crea una llave de pruebas y envía tu primera factura a <code>POST /v1/invoices</code>.
            Las llaves de pruebas envían a la habilitación de la DIAN; las de producción, a
            facturación real.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button render={<Link to="/developers/api-keys" />} nativeButton={false}>
            Crear llave de API
          </Button>
        </CardFooter>
      </Card>
    </>
  );
}
