import { ChartColumnIcon } from "lucide-react";

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty";
import { environmentLabel } from "~/features/environment/EnvironmentSelect";
import type { Metrics } from "~/lib/api/types";

import { DailyChart } from "./DailyChart";
import { MetricTiles, OutcomeLinks } from "./MetricTiles";
import type { Period } from "./periods";
import { PeriodSelect } from "./PeriodSelect";
import { RuleRanking } from "./RuleRanking";

/** How the period's documents went in the active environment, and what the DIAN asked to fix. */
export function Activity({
  metrics,
  period,
  onPeriodChange,
}: {
  metrics: Metrics;
  period: Period;
  onPeriodChange: (period: Period) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Documentos emitidos</CardTitle>
        <CardDescription>
          {`Documentos de ${environmentLabel[metrics.environment].toLowerCase()} por fecha de emisión.`}
        </CardDescription>
        <CardAction>
          <PeriodSelect value={period} onChange={onPeriodChange} />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {metrics.totals.total === 0 ? (
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
        ) : (
          <>
            <MetricTiles metrics={metrics} />
            <OutcomeLinks metrics={metrics} />
            <DailyChart metrics={metrics} />
            <RuleRanking rules={metrics.rules} />
          </>
        )}
      </CardContent>
    </Card>
  );
}
