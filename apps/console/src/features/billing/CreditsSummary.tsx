import { Entry } from "~/components/DetailSection";
import { Progress, ProgressLabel, ProgressValue } from "~/components/ui/progress";
import { formatCount } from "~/features/usage/labels";
import type { AccountCredits } from "~/lib/api/types";

/** What is left of the credits in force, the grace margin of a package and the production issuers. */
export function CreditsSummary({ credits }: { credits: AccountCredits }) {
  const used = credits.granted - credits.available;

  return (
    <div className="flex flex-col gap-4">
      {credits.granted > 0 && (
        <Progress value={used} max={credits.granted}>
          <ProgressLabel>Créditos usados de los lotes vigentes</ProgressLabel>
          <ProgressValue>
            {() => `${formatCount(used)} de ${formatCount(credits.granted)}`}
          </ProgressValue>
        </Progress>
      )}
      <dl className="grid gap-4 sm:grid-cols-3">
        <Entry label="Créditos disponibles">
          <span className="text-sm font-medium tabular-nums">{formatCount(credits.available)}</span>
        </Entry>
        <Entry label="Margen de cortesía usado">
          {credits.productPackage && credits.subscription === null
            ? `${formatCount(credits.graceUsed)} de ${formatCount(credits.graceMargin)} documentos`
            : "No aplica"}
        </Entry>
        <Entry label="Emisores en producción">
          {`${formatCount(credits.issuersLive)} de ${formatCount(credits.issuersIncluded)} incluidos`}
        </Entry>
      </dl>
    </div>
  );
}
