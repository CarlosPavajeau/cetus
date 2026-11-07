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
import type { Issuer, Metrics } from "~/lib/api/types";
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
 * {@code waiting} names the issuers that cannot issue yet, so the empty state points to finishing their habilitación.
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
            {`Documentos de ${environmentLabel[metrics.environment].toLowerCase()} por fecha de emisión.`}
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
              environment={environmentLabel[metrics.environment].toLowerCase()}
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
 * Why an environment with no documents has nothing to show yet: its issuers are still in habilitación. One issuer
 * leads to where it continues (the assistant while it is being set up, its page during the test set); several, to
 * the issuers' list. Only managers can open the assistant, so members go to the issuer's page instead.
 */
function Habilitation({
  issuers,
  environment,
  manage,
}: {
  issuers: Issuer[];
  environment: string;
  manage: boolean;
}) {
  const single = issuers.length === 1 ? issuers[0] : undefined;
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ChartColumnIcon />
        </EmptyMedia>
        <EmptyTitle>
          {single
            ? `Termina la habilitación de ${issuerName(single)} para emitir en ${environment}`
            : `Termina la habilitación de tus emisores para emitir en ${environment}`}
        </EmptyTitle>
        <EmptyDescription>
          {manage
            ? `Cuando la DIAN ${single ? "lo" : "los"} habilite, aquí verás cuántos documentos aceptó, el monto facturado y las reglas que más los rechazan.`
            : "Un administrador de tu organización debe terminarla. Después, aquí verás cuántos documentos aceptó la DIAN y el monto facturado."}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        {single === undefined ? (
          <Link to="/issuers" className={cn(buttonVariants({ variant: "outline" }))}>
            Ver emisores
          </Link>
        ) : manage && single.status === "ONBOARDING" ? (
          <Link
            to="/setup"
            search={{ issuerId: single.id }}
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Continuar habilitación
          </Link>
        ) : (
          <Link
            to="/issuers/$issuerId"
            params={{ issuerId: single.id }}
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            {manage ? "Continuar habilitación" : "Ver emisor"}
          </Link>
        )}
      </EmptyContent>
    </Empty>
  );
}
