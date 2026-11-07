import { Link } from "@tanstack/react-router";
import { ChartColumnIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "~/components/ui/badge";
import { Button, buttonVariants } from "~/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty";
import { environmentLabel } from "~/features/environment/EnvironmentSelect";
import { issuerName } from "~/features/issuers/labels";
import type { Environment, Issuer, Metrics } from "~/lib/api/types";
import { cn } from "~/lib/utils";

import { DailyChart } from "./DailyChart";
import { IssuerSelect } from "./IssuerSelect";
import { formatDay } from "./labels";
import { MetricTiles } from "./MetricTiles";
import { type Period, periodDefault, periodLabel } from "./periods";
import { PeriodSelect } from "./PeriodSelect";
import { RuleRanking } from "./RuleRanking";

/**
 * How the period's documents went in the active environment, and what the DIAN asked to fix. With several
 * issuers and none picked, {@code breakdown} shows each one's amount instead of a sum, since adding up different
 * companies' amounts tells an accountant nothing; otherwise {@code numbering} shows how much of the issuer's ranges
 * is used, since the breakdown already carries each issuer's. {@code issued} says whether the environment has any
 * documents at all, so an empty period points to another period instead of to issuing a first one. Without any,
 * {@code waiting} names the issuers that cannot issue yet, so the empty state points to finishing their habilitación,
 * and an environment with no issuers explains how one gets there, through {@code promotable}'s test issuers in
 * producción. With {@code leads}, the empty state's action is the page's main one.
 */
export function Activity({
  metrics,
  period,
  onPeriodChange,
  issuers,
  issuerId,
  onIssuerChange,
  breakdown,
  numbering,
  issued,
  waiting,
  promotable,
  leads,
  manage,
}: {
  metrics: Metrics;
  period: Period;
  onPeriodChange: (period: Period) => void;
  issuers: Issuer[];
  issuerId: string | undefined;
  onIssuerChange: (issuerId: string | undefined) => void;
  breakdown: ReactNode;
  numbering: ReactNode;
  issued: boolean;
  waiting: Issuer[];
  promotable: Issuer[];
  leads: boolean;
  manage: boolean;
}) {
  return (
    <section aria-labelledby="activity-title" className="flex flex-col gap-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h2 id="activity-title" className="text-base font-medium">
              Documentos emitidos
            </h2>
            {metrics.environment === "SANDBOX" && <Badge variant="muted">Simulado</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">
            {issued
              ? `Documentos de ${environmentLabel[metrics.environment].toLowerCase()} emitidos del ${formatDay(metrics.from)} al ${formatDay(metrics.to)}.`
              : `Documentos de ${environmentLabel[metrics.environment].toLowerCase()} por fecha de emisión.`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {issuers.length > 1 && (
            <IssuerSelect issuers={issuers} value={issuerId} onChange={onIssuerChange} />
          )}
          {issued && <PeriodSelect value={period} onChange={onPeriodChange} />}
        </div>
      </header>
      {metrics.totals.total === 0 ? (
        <>
          {issued ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ChartColumnIcon />
                </EmptyMedia>
                <EmptyTitle>
                  {`Sin documentos entre ${formatDay(metrics.from)} y ${formatDay(metrics.to)}`}
                </EmptyTitle>
                <EmptyDescription>
                  {issuerId === undefined
                    ? "Este ambiente tiene documentos, pero ninguno con fecha de emisión en este periodo."
                    : "Este emisor tiene documentos, pero ninguno con fecha de emisión en este periodo."}
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                {period === periodDefault ? (
                  <Link
                    to="/documents"
                    search={{ issuerId }}
                    className={cn(buttonVariants({ variant: "outline" }))}
                  >
                    Ver todos los documentos
                  </Link>
                ) : (
                  <Button variant="outline" onClick={() => onPeriodChange(periodDefault)}>
                    {`Ver ${periodLabel[periodDefault].toLowerCase()}`}
                  </Button>
                )}
              </EmptyContent>
            </Empty>
          ) : waiting.length > 0 ? (
            <Habilitation
              issuers={waiting}
              environment={metrics.environment}
              leads={leads}
              manage={manage}
            />
          ) : issuers.length === 0 && metrics.environment !== "SANDBOX" ? (
            <NoIssuers
              environment={metrics.environment}
              promotable={promotable}
              leads={leads}
              manage={manage}
            />
          ) : (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ChartColumnIcon />
                </EmptyMedia>
                <EmptyTitle>Sin documentos en este periodo</EmptyTitle>
                <EmptyDescription>
                  Cuando emitas documentos en este ambiente, aquí verás cuántos aceptó la DIAN, el
                  monto facturado y las reglas que más los rechazan.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
          {breakdown}
          {numbering}
        </>
      ) : (
        <div className="flex flex-col gap-6">
          <MetricTiles metrics={metrics} amountShown={breakdown === null} issuerId={issuerId} />
          {breakdown}
          {numbering}
          <DailyChart metrics={metrics} />
          <RuleRanking rules={metrics.rules} simulated={metrics.environment === "SANDBOX"} />
        </div>
      )}
    </section>
  );
}

/**
 * Why an environment with no documents has nothing to show yet: its issuers are still in habilitación, or in
 * producción, still being set up. One issuer leads to where it continues (the assistant while its configuration is
 * pending, its page during the test set); several, to the issuers' list. Only managers can open the assistant, so members go
 * to the issuer's page instead.
 */
function Habilitation({
  issuers,
  environment,
  leads,
  manage,
}: {
  issuers: Issuer[];
  environment: Environment;
  leads: boolean;
  manage: boolean;
}) {
  const single = issuers.length === 1 ? issuers[0] : undefined;
  const live = environment === "LIVE";
  const step = live ? "Termina de configurar" : "Termina la habilitación de";
  const where = live ? "producción" : "pruebas";
  const className = cn(buttonVariants({ variant: leads ? "default" : "outline" }));
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ChartColumnIcon />
        </EmptyMedia>
        <EmptyTitle>
          {single
            ? `${step} ${issuerName(single)} para emitir en ${where}`
            : `${step} tus emisores para emitir en ${where}`}
        </EmptyTitle>
        <EmptyDescription>
          {!manage
            ? "Un administrador de tu organización debe terminarla. Después, aquí verás cuántos documentos aceptó la DIAN y el monto facturado."
            : live
              ? "Cuando termines, aquí verás cuántos documentos aceptó la DIAN, el monto facturado y las reglas que más los rechazan."
              : `Cuando la DIAN ${single ? "lo" : "los"} habilite, aquí verás cuántos documentos aceptó, el monto facturado y las reglas que más los rechazan.`}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        {single === undefined ? (
          <Link to="/issuers" className={className}>
            Ver emisores
          </Link>
        ) : manage && single.status === "ONBOARDING" ? (
          <Link to="/setup" search={{ issuerId: single.id }} className={className}>
            Continuar configuración
          </Link>
        ) : (
          <Link to="/issuers/$issuerId" params={{ issuerId: single.id }} className={className}>
            {manage ? "Continuar habilitación" : "Ver emisor"}
          </Link>
        )}
      </EmptyContent>
    </Empty>
  );
}

/**
 * Pruebas or producción without an issuer of their own. Pruebas fills once an issuer starts habilitación, which the
 * steps already offer. Producción takes a test issuer the DIAN approved, moved there from its page, plus a plan or
 * package: issuing there needs one.
 */
function NoIssuers({
  environment,
  promotable,
  leads,
  manage,
}: {
  environment: "TEST" | "LIVE";
  promotable: Issuer[];
  leads: boolean;
  manage: boolean;
}) {
  const single = promotable.length === 1 ? promotable[0] : undefined;
  const className = cn(buttonVariants({ variant: leads ? "default" : "outline" }));
  if (environment === "TEST") {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ChartColumnIcon />
          </EmptyMedia>
          <EmptyTitle>Aún no tienes emisores en pruebas</EmptyTitle>
          <EmptyDescription>
            {manage
              ? "En pruebas haces la habilitación con la DIAN: tu software, tu certificado y el set de pruebas. Cuando la empieces, aquí verás cuántos documentos aceptó la DIAN y las reglas que más los rechazan."
              : "En pruebas se hace la habilitación con la DIAN. Un administrador de tu organización debe empezarla."}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ChartColumnIcon />
        </EmptyMedia>
        <EmptyTitle>Aún no tienes emisores en producción</EmptyTitle>
        <EmptyDescription>
          {!manage
            ? "Un administrador de tu organización debe pasar un emisor de pruebas a producción cuando la DIAN apruebe su habilitación."
            : promotable.length > 0
              ? "Cuando la DIAN apruebe el set de pruebas, pasa el emisor a producción desde su página: solo te faltará la resolución de numeración de producción. Emitir en producción requiere un plan o un paquete activo."
              : "Primero habilita un emisor en pruebas con la DIAN. Después lo pasas a producción y solo te faltará la resolución de numeración de producción. Emitir en producción requiere un plan o un paquete activo."}
        </EmptyDescription>
      </EmptyHeader>
      {manage && (
        <EmptyContent>
          <div className="flex flex-wrap justify-center gap-2">
            {single ? (
              <Link to="/issuers/$issuerId" params={{ issuerId: single.id }} className={className}>
                Ver emisor de pruebas
              </Link>
            ) : (
              promotable.length > 1 && (
                <Link to="/issuers" className={className}>
                  Ver emisores
                </Link>
              )
            )}
            <Link to="/billing" className={cn(buttonVariants({ variant: "ghost" }))}>
              Ver planes
            </Link>
          </div>
        </EmptyContent>
      )}
    </Empty>
  );
}
