import { Entry } from "~/components/DetailSection";
import { Progress, ProgressLabel, ProgressValue } from "~/components/ui/progress";
import { documentTypeLabel } from "~/features/documents/labels";
import type { PeriodUsage } from "~/lib/api/types";

import { formatCop, formatCount, periodLabel } from "./labels";

/** The billable documents of a month against the plan's quota, with the overage when it went over. */
export function PeriodUsageSummary({ usage }: { usage: PeriodUsage }) {
  const included = usage.plan.documentsIncluded;

  return (
    <div className="flex flex-col gap-4">
      {included === null ? (
        <p className="text-sm">
          <span className="font-medium tabular-nums">{formatCount(usage.total)}</span> documentos
          facturables en {periodLabel(usage.period).toLowerCase()}
        </p>
      ) : (
        <Progress value={Math.min(usage.total, included)} max={included}>
          <ProgressLabel>{periodLabel(usage.period)}</ProgressLabel>
          <ProgressValue>
            {() => `${formatCount(usage.total)} de ${formatCount(included)} documentos`}
          </ProgressValue>
        </Progress>
      )}
      {usage.overage > 0 && (
        <p className="text-xs text-muted-foreground">
          {formatCount(usage.overage)} documentos por encima del plan
          {usage.costOverageCop !== null && ` · ${formatCop(usage.costOverageCop)} de excedente`}.
          La facturación no se detiene.
        </p>
      )}
      <dl className="grid gap-4 sm:grid-cols-3">
        {usage.documents.map((document) => (
          <Entry key={document.documentType} label={documentTypeLabel[document.documentType]}>
            <span className="tabular-nums">{formatCount(document.count)}</span>
          </Entry>
        ))}
      </dl>
    </div>
  );
}
