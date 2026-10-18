import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute, redirect } from "@tanstack/react-router";
import { BuildingIcon } from "lucide-react";

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
import { issuersQuery } from "~/features/issuers/queries";
import type { Issuer } from "~/lib/api/types";

export const Route = createFileRoute("/_app/overview")({
  loader: async ({ context: { queryClient } }) => {
    const [, issuers] = await Promise.all([
      queryClient.ensureQueryData(accountQuery),
      queryClient.ensureQueryData(issuersQuery),
    ]);
    // A new organization starts by setting up its issuer.
    if (issuers.length === 0) {
      throw redirect({ to: "/setup" });
    }
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
  const { data: account } = useSuspenseQuery(accountQuery);
  const { data: issuers } = useSuspenseQuery(issuersQuery);

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
                  Un emisor es la empresa que factura: su NIT, su certificado de firma y su
                  resolución de numeración. El asistente te guía para configurarlo.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button render={<Link to="/setup" />} nativeButton={false}>
                  Configurar emisor
                </Button>
              </EmptyContent>
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
                    <TableCell>
                      {issuer.status === "ONBOARDING" ? (
                        <Button
                          variant="link"
                          size="sm"
                          className="h-auto px-0"
                          render={<Link to="/setup" />}
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
