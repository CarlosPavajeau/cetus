import { useSuspenseInfiniteQuery, useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowUpRightIcon, BuildingIcon, FileTextIcon } from "lucide-react";

import { EnvironmentBadge } from "~/components/EnvironmentBadge";
import { PageHeader } from "~/components/PageHeader";
import { buttonVariants } from "~/components/ui/button";
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
import { accountStatusLabel } from "~/features/admin/labels";
import { accountStatuses } from "~/features/admin/schema";
import { CreditsSummary } from "~/features/billing/CreditsSummary";
import { creditsProductLabel } from "~/features/billing/labels";
import { creditsQuery } from "~/features/billing/queries";
import { documentsQuery } from "~/features/documents/queries";
import { activeEnvironmentQuery, useActiveEnvironment } from "~/features/environment/queries";
import { issuerName, statusLabel } from "~/features/issuers/labels";
import { issuersQuery } from "~/features/issuers/queries";
import { Activity } from "~/features/metrics/Activity";
import { IssuerAlerts } from "~/features/metrics/IssuerAlerts";
import {
  type Period,
  periodDefault,
  periodRange,
  periods,
  todayInColombia,
} from "~/features/metrics/periods";
import { alertsQuery, metricsQuery } from "~/features/metrics/queries";
import { useMemberPermissions } from "~/features/session/useMemberPermissions";
import { docsUrl } from "~/lib/docs";
import { cn } from "~/lib/utils";

export const Route = createFileRoute("/_app/overview")({
  // An unknown period is dropped instead of failing the page.
  validateSearch: (search: Record<string, unknown>): { period?: Period } => ({
    period: periods.find((each) => each !== periodDefault && each === search.period),
  }),
  loaderDeps: ({ search }) => ({ period: search.period ?? periodDefault }),
  loader: async ({ context: { queryClient }, deps }) => {
    const environment = await queryClient.query({ ...activeEnvironmentQuery, staleTime: "static" });
    await Promise.all([
      queryClient.query({ ...accountQuery, staleTime: "static" }),
      queryClient.query({ ...issuersQuery, staleTime: "static" }),
      queryClient.query({ ...creditsQuery, staleTime: "static" }),
      queryClient.infiniteQuery({
        ...documentsQuery({ environment: "SANDBOX" }),
        staleTime: "static",
      }),
      queryClient.query({
        ...metricsQuery(environment, periodRange(deps.period, todayInColombia())),
        staleTime: "static",
      }),
      queryClient.query({ ...alertsQuery(environment), staleTime: "static" }),
    ]);
  },
  component: Overview,
});

function Overview() {
  const { data: account } = useSuspenseQuery(accountQuery);
  const { data: issuers } = useSuspenseQuery(issuersQuery);
  const { data: credits } = useSuspenseQuery(creditsQuery);
  const { data: sandboxDocuments } = useSuspenseInfiniteQuery(
    documentsQuery({ environment: "SANDBOX" }),
  );
  const environment = useActiveEnvironment();
  const period = Route.useSearch({ select: (search) => search.period ?? periodDefault });
  const { data: metrics } = useSuspenseQuery(
    metricsQuery(environment, periodRange(period, todayInColombia())),
  );
  const { data: alerts } = useSuspenseQuery(alertsQuery(environment));
  const navigate = useNavigate({ from: Route.fullPath });
  const { manage } = useMemberPermissions();
  // A new organization only has the sandbox sample, which needs no setup.
  const fiscal = issuers.some((issuer) => issuer.environment !== "SANDBOX");
  const tried = sandboxDocuments.pages.some((page) => page.items.length > 0);
  const status = accountStatuses.find((each) => each === account.status);
  const statusText = status === undefined ? account.status : accountStatusLabel[status];

  return (
    <>
      <PageHeader
        title={account.name}
        lead={`${creditsProductLabel(credits)} · cuenta ${statusText.toLowerCase()}`}
      />

      {environment === "SANDBOX" && !tried && (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileTextIcon />
            </EmptyMedia>
            <EmptyTitle>Emite tu primera factura simulada</EmptyTitle>
            <EmptyDescription>
              Ya tienes un emisor de ejemplo listo. Emite una factura simulada y mira su ciclo
              completo: el estado ante la DIAN, el PDF y el XML. No tiene validez fiscal.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Link to="/documents/new" className={cn(buttonVariants())}>
              Emitir factura simulada
            </Link>
          </EmptyContent>
        </Empty>
      )}

      {alerts.certificates.length + alerts.ranges.length > 0 && <IssuerAlerts alerts={alerts} />}

      {!(environment === "SANDBOX" && !tried) && (
        <Activity
          metrics={metrics}
          period={period}
          onPeriodChange={(next) =>
            navigate({ search: { period: next === periodDefault ? undefined : next } })
          }
        />
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
            <Link to="/setup" className={cn(buttonVariants({ variant: "outline" }))}>
              Configurar emisor
            </Link>
          </CardFooter>
        </Card>
      )}

      {fiscal && (
        <Card>
          <CardHeader>
            <CardTitle>Créditos</CardTitle>
            <CardDescription>
              Cada documento que emites en producción usa un crédito de tus paquetes y recargas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CreditsSummary credits={credits} />
          </CardContent>
          <CardFooter>
            <Link to="/billing" className={cn(buttonVariants({ variant: "outline" }))}>
              Ver facturación
            </Link>
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
            <Empty>
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
                  <Link to="/setup" className={cn(buttonVariants())}>
                    Configurar emisor
                  </Link>
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
                        <Link
                          to="/setup"
                          search={{ issuerId: issuer.id }}
                          className={cn(
                            buttonVariants({
                              variant: "link",
                              size: "sm",
                              className: "h-auto px-0",
                            }),
                          )}
                        >
                          Continuar configuración
                        </Link>
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
            Crea una llave de simulación y envía tu primera factura a <code>POST /v1/invoices</code>
            . Las llaves de pruebas envían a la habilitación de la DIAN; las de producción, a
            facturación real.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Link to="/developers/api-keys" className={cn(buttonVariants({ variant: "outline" }))}>
            Crear llave de API
          </Link>
          <a
            href={`${docsUrl}/inicio-rapido/desarrolladores`}
            target="_blank"
            rel="noreferrer"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Ver el inicio rápido
            <ArrowUpRightIcon data-icon="inline-end" strokeWidth={2} absoluteStrokeWidth />
          </a>
        </CardFooter>
      </Card>
    </>
  );
}
