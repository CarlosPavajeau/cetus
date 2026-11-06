import { useSuspenseInfiniteQuery, useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowUpRightIcon,
  CodeXmlIcon,
  FileCheckIcon,
  FileTextIcon,
  ListChecksIcon,
  PlusIcon,
} from "lucide-react";
import type { ReactNode } from "react";

import { PageHeader } from "~/components/PageHeader";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { buttonVariants } from "~/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty";
import { apiKeysQuery } from "~/features/api-keys/queries";
import { documentsQuery } from "~/features/documents/queries";
import { activeEnvironmentQuery, useActiveEnvironment } from "~/features/environment/queries";
import { issuerName } from "~/features/issuers/labels";
import { issuersQuery } from "~/features/issuers/queries";
import { Activity } from "~/features/metrics/Activity";
import { IssuerWarnings, NumberingUsage } from "~/features/metrics/IssuerAlerts";
import { IssuerBreakdown } from "~/features/metrics/IssuerBreakdown";
import {
  type Period,
  periodDefault,
  periodRange,
  periods,
  todayInColombia,
} from "~/features/metrics/periods";
import { alertsQuery, issuerMetricsQuery, metricsQuery } from "~/features/metrics/queries";
import { useMemberPermissions } from "~/features/session/useMemberPermissions";
import type { Environment, Issuer } from "~/lib/api/types";
import { docsUrl } from "~/lib/docs";
import { cn } from "~/lib/utils";

export const Route = createFileRoute("/_app/overview")({
  // An unknown period is dropped instead of failing the page.
  validateSearch: (search: Record<string, unknown>): { period?: Period; issuer?: string } => ({
    period: periods.find((each) => each !== periodDefault && each === search.period),
    issuer: typeof search.issuer === "string" ? search.issuer : undefined,
  }),
  loaderDeps: ({ search }) => ({ period: search.period ?? periodDefault, issuer: search.issuer }),
  loader: async ({ context: { queryClient }, deps }) => {
    const [environment, issuers] = await Promise.all([
      queryClient.query({ ...activeEnvironmentQuery, staleTime: "static" }),
      queryClient.query({ ...issuersQuery, staleTime: "static" }),
    ]);
    const { issuerId, breakdown } = issuerFilter(issuers, environment, deps.issuer);
    const range = periodRange(deps.period, todayInColombia());
    await Promise.all([
      queryClient.query({ ...apiKeysQuery, staleTime: "static" }),
      queryClient.infiniteQuery({
        ...documentsQuery({ environment: "SANDBOX" }),
        staleTime: "static",
      }),
      queryClient.query({ ...metricsQuery(environment, range, issuerId), staleTime: "static" }),
      breakdown &&
        queryClient.query({ ...issuerMetricsQuery(environment, range), staleTime: "static" }),
      queryClient.query({ ...alertsQuery(environment), staleTime: "static" }),
    ]);
  },
  component: Overview,
});

function Overview() {
  const { data: issuers } = useSuspenseQuery(issuersQuery);
  const { data: keys } = useSuspenseQuery(apiKeysQuery);
  const { data: sandboxDocuments } = useSuspenseInfiniteQuery(
    documentsQuery({ environment: "SANDBOX" }),
  );
  const environment = useActiveEnvironment();
  const search = Route.useSearch();
  const period = search.period ?? periodDefault;
  const {
    options: issuerOptions,
    issuerId,
    breakdown,
  } = issuerFilter(issuers, environment, search.issuer);
  const range = periodRange(period, todayInColombia());
  const { data: metrics } = useSuspenseQuery(metricsQuery(environment, range, issuerId));
  const { data: alerts } = useSuspenseQuery(alertsQuery(environment));
  const navigate = useNavigate({ from: Route.fullPath });
  const { manage } = useMemberPermissions();
  // A new organization only has the sandbox sample, which needs no setup.
  const fiscal = issuers.some((issuer) => issuer.environment !== "SANDBOX");
  const settingUp = issuers.filter(
    (issuer) => issuer.environment !== "SANDBOX" && issuer.status === "ONBOARDING",
  );
  const integrated = keys.some((key) => key.revokedAt === null);
  const tried = sandboxDocuments.pages.some((page) => page.items.length > 0);

  const sandboxFirst = environment === "SANDBOX" && !tried;
  const steps = {
    configure: !fiscal && manage,
    resume: manage ? settingUp.slice(0, resumeShownMax) : [],
    integrate: !integrated && manage,
  };
  const resumeHidden = manage ? settingUp.length - steps.resume.length : 0;
  const pending =
    Number(steps.configure) + steps.resume.length + resumeHidden + Number(steps.integrate);
  const stepping = pending > 0;
  // The first pending step is the page's main action, unless the sandbox sample still waits for one.
  const leading = sandboxFirst
    ? undefined
    : steps.configure
      ? "configure"
      : (steps.resume[0]?.id ?? (steps.integrate ? "integrate" : undefined));
  const stepAction = (step: string) =>
    cn(buttonVariants({ variant: step === leading ? "default" : "outline", size: "sm" }));
  const changeSearch = (next: { period?: Period; issuer?: string }) =>
    navigate({ search: (previous) => ({ ...previous, ...next }), resetScroll: false });

  return (
    <>
      <PageHeader
        title="Resumen"
        action={
          !sandboxFirst && (
            <Link
              to="/documents/new"
              className={cn(
                buttonVariants({ variant: leading === undefined ? "default" : "outline" }),
              )}
            >
              <PlusIcon data-icon="inline-start" />
              Emitir factura
            </Link>
          )
        }
      />

      {sandboxFirst && (
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

      <IssuerWarnings alerts={alerts} />

      {stepping && (
        <div className="flex flex-col gap-2">
          {steps.configure && (
            <Step
              icon={<FileCheckIcon aria-hidden="true" />}
              title="Factura con validez fiscal"
              description="Configura tu NIT, el software registrado en la DIAN, el certificado de firma y la resolución de numeración. El asistente te guía."
            >
              <Link to="/setup" className={stepAction("configure")}>
                Configurar emisor
              </Link>
            </Step>
          )}
          {steps.resume.map((issuer) => (
            <Step
              key={issuer.id}
              icon={<ListChecksIcon aria-hidden="true" />}
              title={`Termina de configurar ${issuerName(issuer)}`}
              description="Sigue en habilitación. Retoma el asistente donde lo dejaste."
            >
              <Link
                to="/setup"
                search={{ issuerId: issuer.id }}
                className={stepAction(issuer.id)}
                aria-label={`Continuar configuración de ${issuerName(issuer)}`}
              >
                Continuar configuración
              </Link>
            </Step>
          ))}
          {resumeHidden > 0 && (
            <p className="px-1 text-xs text-muted-foreground">
              {resumeHidden === 1
                ? "Y 1 emisor más en configuración. "
                : `Y ${resumeHidden} emisores más en configuración. `}
              <Link
                to="/issuers"
                className="text-foreground underline underline-offset-4 hover:text-foreground/80"
              >
                Ver emisores
              </Link>
            </p>
          )}
          {steps.integrate && (
            <Step
              icon={<CodeXmlIcon aria-hidden="true" />}
              title="Integra tu sistema"
              description={
                <>
                  Crea una llave de API y envía tu primera factura a <code>POST /v1/invoices</code>.
                </>
              }
            >
              <a
                href={`${docsUrl}/inicio-rapido/desarrolladores`}
                target="_blank"
                rel="noreferrer"
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
              >
                Ver el inicio rápido
                <ArrowUpRightIcon data-icon="inline-end" strokeWidth={2} nonScalingStroke />
              </a>
              <Link to="/developers/api-keys" className={stepAction("integrate")}>
                Crear llave de API
              </Link>
            </Step>
          )}
        </div>
      )}

      {!sandboxFirst && (
        <Activity
          metrics={metrics}
          period={period}
          onPeriodChange={(next) =>
            changeSearch({ period: next === periodDefault ? undefined : next })
          }
          issuers={issuerOptions}
          issuerId={issuerId}
          onIssuerChange={(next) => changeSearch({ issuer: next })}
          breakdown={
            breakdown ? (
              <IssuerBreakdown
                environment={environment}
                range={range}
                issuers={issuerOptions}
                certificates={alerts.certificates}
                ranges={alerts.ranges}
              />
            ) : null
          }
        />
      )}

      {alerts.ranges.length > 0 && (
        <div className="grid items-start gap-4 lg:grid-cols-2">
          <NumberingUsage ranges={alerts.ranges} />
        </div>
      )}
    </>
  );
}

const resumeShownMax = 3;

/**
 * The active environment's issuers to narrow the metrics by, the one asked for if it is among them, and whether
 * the overview breaks the period down by issuer: with several and none picked.
 */
function issuerFilter(issuers: Issuer[], environment: Environment, asked: string | undefined) {
  const options = issuers.filter(
    (issuer) => issuer.environment === environment && issuer.status !== "DISABLED",
  );
  const issuerId = options.find((issuer) => issuer.id === asked)?.id;
  return { options, issuerId, breakdown: issuerId === undefined && options.length > 1 };
}

/** One pending step: what is missing and the action that resolves it. */
function Step({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode;
  title: string;
  description: ReactNode;
  children: ReactNode;
}) {
  return (
    <Alert role="note">
      {icon}
      <AlertTitle>
        <h2>{title}</h2>
      </AlertTitle>
      <AlertDescription>{description}</AlertDescription>
      <AlertAction>
        <div className="flex flex-wrap items-center gap-2">{children}</div>
      </AlertAction>
    </Alert>
  );
}
