import { Link } from "@tanstack/react-router";
import { ChartColumnIcon } from "lucide-react";
import type { ReactNode } from "react";

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
import type { Issuer, Metrics } from "~/lib/api/types";

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
 * documents at all, so an empty period points to another period instead of to issuing a first one.
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
}) {
  return (
    <section aria-labelledby="activity-title" className="flex flex-col gap-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <h2 id="activity-title" className="text-base font-medium">
            Documentos emitidos
          </h2>
          <p className="text-sm text-muted-foreground">
            {`Documentos de ${environmentLabel[metrics.environment].toLowerCase()} por fecha de emisión.`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {issuers.length > 1 && (
            <IssuerSelect issuers={issuers} value={issuerId} onChange={onIssuerChange} />
          )}
          <PeriodSelect value={period} onChange={onPeriodChange} />
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
                    className={buttonVariants({ variant: "outline" })}
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
