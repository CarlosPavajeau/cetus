import { Entry } from "~/components/DetailSection";
import { Progress, ProgressLabel, ProgressValue } from "~/components/ui/progress";
import { dateFormat } from "~/features/api-keys/formats";
import { formatCount } from "~/features/usage/labels";
import type { Subscription } from "~/lib/api/types";

import { documentsLabel, formatCents, overageLabel, subscriptionStatusLabel } from "./labels";

/** The open period of the subscription: what its lot has left, the overage so far and what comes next. */
export function SubscriptionSummary({ subscription }: { subscription: Subscription }) {
  const period = subscription.period;
  const used =
    period.documentsAvailable === null
      ? null
      : period.documentsIncluded - period.documentsAvailable;
  const until = dateFormat.format(new Date(period.endsAt));

  return (
    <div className="flex flex-col gap-4">
      {used !== null && (
        <Progress value={used} max={period.documentsIncluded}>
          <ProgressLabel>Documentos del periodo</ProgressLabel>
          <ProgressValue>
            {() => `${formatCount(used)} de ${formatCount(period.documentsIncluded)}`}
          </ProgressValue>
        </Progress>
      )}
      <dl className="grid gap-4 sm:grid-cols-3">
        <Entry label="Plan">
          {subscription.planName}
          <span className="block text-muted-foreground">
            {`${formatCents(subscription.version.totalCents)} al mes · ${documentsLabel(period.documentsIncluded)}`}
          </span>
        </Entry>
        <Entry label="Estado">{subscriptionStatusLabel[subscription.status]}</Entry>
        <Entry label="Periodo">
          {`${dateFormat.format(new Date(period.startsAt))} al ${until}`}
        </Entry>
        <Entry label="Excedente del periodo">
          <span className="tabular-nums">
            {`${documentsLabel(period.overage)} · ${formatCents(period.overageCostCents)}`}
          </span>
          <span className="block text-muted-foreground">
            {`${overageLabel(period.priceOverageCents)}, se cobra al cierre`}
          </span>
        </Entry>
        <Entry label="Límite de excedente">
          <span className="tabular-nums">
            {`${formatCents(subscription.overageLimitCents)} · ${formatCount(period.overageLimited)} de ${documentsLabel(subscription.overageLimit)}`}
          </span>
          <span className="block text-muted-foreground">
            Al llegar a él, la emisión se detiene hasta el siguiente periodo, salvo las notas
            crédito.
          </span>
        </Entry>
        <Entry label={subscription.cancelAtPeriodEnd ? "Termina" : "Próxima renovación"}>
          {until}
          {subscription.planNextName !== null && (
            <span className="block text-muted-foreground">
              {`Desde entonces, plan ${subscription.planNextName}`}
            </span>
          )}
        </Entry>
      </dl>
    </div>
  );
}
