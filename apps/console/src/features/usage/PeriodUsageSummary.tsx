import { Entry } from "~/components/DetailSection";
import { documentTypeLabel } from "~/features/documents/labels";
import type { PeriodUsage } from "~/lib/api/types";

import { formatCount, periodLabel } from "./labels";

/** The billable documents of a month, by type. */
export function PeriodUsageSummary({ usage }: { usage: PeriodUsage }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm">
        <span className="font-medium tabular-nums">{formatCount(usage.total)}</span> documentos
        facturables en {periodLabel(usage.period).toLowerCase()}
      </p>
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
