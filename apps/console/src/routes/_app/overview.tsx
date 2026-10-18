import { Link, createFileRoute } from "@tanstack/react-router";
import { BuildingIcon } from "lucide-react";
import { EnvironmentBadge } from "~/components/EnvironmentBadge";
import { PageHeader } from "~/components/PageHeader";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "~/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "~/components/ui/empty";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { getAccount } from "~/features/account/server";
import { listIssuers } from "~/features/issuers/server";
import type { Issuer } from "~/lib/api/types";

export const Route = createFileRoute("/_app/overview")({
  loader: async () => {
    const [account, issuers] = await Promise.all([getAccount(), listIssuers()]);
    return { account, issuers };
  },
  component: Overview,
});

const statusLabel: Record<Issuer["status"], string> = {
  ONBOARDING: "Configuración pendiente",
  TESTING: "En habilitación",
  ENABLED: "Habilitado",
  DISABLED: "Deshabilitado",
};

function Overview() {
  const { account, issuers } = Route.useLoaderData();

  return (
    <>
      <PageHeader
        title={account.name}
        lead={`Plan ${account.plan.toLowerCase()} · cuenta ${account.status.toLowerCase()}`}
      />

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
                  Un emisor es la empresa que factura: su NIT, su certificado de firma y su resolución de numeración.
                  Por ahora se registran con la API de consola; el asistente visual es el siguiente paso.
                </EmptyDescription>
              </EmptyHeader>
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
                    <TableCell>{issuer.tradeName ?? issuer.legalName}</TableCell>
                    <TableCell className="tabular-nums">
                      {issuer.nit}-{issuer.checkDigit}
                    </TableCell>
                    <TableCell>
                      <EnvironmentBadge environment={issuer.environment} />
                    </TableCell>
                    <TableCell>{statusLabel[issuer.status]}</TableCell>
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
            Crea una llave de pruebas y envía tu primera factura a <code>POST /v1/invoices</code>. Las llaves de pruebas
            envían a la habilitación de la DIAN; las de producción, a facturación real.
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
