import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { Badge } from "~/components/ui/badge";
import { formatCount } from "~/features/usage/labels";
import type { DocumentStatus, Metrics } from "~/lib/api/types";
import { cn } from "~/lib/utils";

import { formatAmount, formatDuration, formatPercent } from "./labels";

function Tile({
  label,
  value,
  detail,
  note,
  simulated,
}: {
  label: string;
  value: string;
  detail: ReactNode;
  note?: string;
  simulated: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-lg border p-3">
      <dt className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        {label}
        {simulated && <Badge variant="muted">Simulado</Badge>}
      </dt>
      <dd className="font-mono text-2xl font-medium tracking-tight tabular-nums">{value}</dd>
      <dd className="text-xs text-pretty text-muted-foreground">{detail}</dd>
      {note && <dd className="text-xs text-pretty text-muted-foreground">{note}</dd>}
    </div>
  );
}

/** Below this many answered documents, one rejection moves the rate by five points or more. */
const sampleAnsweredMin = 20;

const columnsByCount: Record<number, string> = {
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
};

/**
 * The period's documents, how many the DIAN accepted, what they add up to and how long the DIAN took. Without
 * {@code amountShown} the amount is left out, since several issuers' amounts add up to nothing useful. In sandbox
 * the simulator answers at once, so its response time would say nothing about the DIAN and is left out.
 */
export function MetricTiles({
  metrics,
  amountShown,
  issuerId,
}: {
  metrics: Metrics;
  amountShown: boolean;
  issuerId?: string;
}) {
  const { totals, acceptanceRate, amounts, validation } = metrics;
  const [amount, ...others] = amounts;
  const simulated = metrics.environment === "SANDBOX";
  const answered = totals.accepted + totals.rejected;

  return (
    <dl
      className={cn(
        "grid gap-3 sm:grid-cols-2",
        columnsByCount[2 + Number(amountShown) + Number(!simulated)],
      )}
    >
      <Tile
        label="Documentos"
        simulated={simulated}
        value={formatCount(totals.total)}
        detail={
          totals.inProgress > 0 ? `${formatCount(totals.inProgress)} en curso` : "Ninguno en curso"
        }
      />
      <Tile
        label="Tasa de aceptación"
        value={acceptanceRate === null ? "—" : formatPercent(acceptanceRate)}
        simulated={simulated}
        detail={<OutcomeLinks metrics={metrics} issuerId={issuerId} />}
        note={
          answered > 0 && answered < sampleAnsweredMin
            ? "Muestra pequeña: un solo documento mueve mucho el porcentaje."
            : undefined
        }
      />
      {amountShown && (
        <Tile
          label="Monto facturado"
          simulated={simulated}
          value={amount ? formatAmount(amount.net, amount.currency) : formatAmount(0, "COP")}
          detail={
            others.length > 0
              ? `Y ${others.map((each) => formatAmount(each.net, each.currency)).join(", ")}`
              : "Facturas y notas débito, menos notas crédito"
          }
        />
      )}
      {!simulated && (
        <Tile
          label="Tiempo hasta la validación"
          simulated={false}
          value={
            validation.secondsAverage === null ? "—" : formatDuration(validation.secondsAverage)
          }
          detail={
            validation.secondsP95 === null
              ? "Sin respuestas de la DIAN"
              : `Promedio. 95 de cada 100 tardaron ${validation.secondsP95 < 1 ? "" : "hasta "}${formatDuration(validation.secondsP95)}`
          }
        />
      )}
    </dl>
  );
}

const outcomes: {
  status: DocumentStatus;
  label: string;
  key: "accepted" | "rejected" | "failed";
}[] = [
  { status: "ACCEPTED", label: "Aceptados", key: "accepted" },
  { status: "REJECTED", label: "Rechazados", key: "rejected" },
  { status: "FAILED", label: "Fallidos", key: "failed" },
];

/** Each final outcome of the period, linked to the documents behind it. Rejections are the ones to fix. */
function OutcomeLinks({ metrics, issuerId }: { metrics: Metrics; issuerId?: string }) {
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-0.5">
      {outcomes.map((outcome) => {
        const count = metrics.totals[outcome.key];
        return (
          <li key={outcome.status}>
            <Link
              to="/documents"
              search={{ status: outcome.status, issuerId, from: metrics.from, to: metrics.to }}
              className="underline-offset-4 hover:text-foreground hover:underline"
            >
              {outcome.label}{" "}
              <span
                className={cn(
                  "font-mono font-medium tabular-nums",
                  outcome.key === "rejected" && count > 0
                    ? "text-destructive-foreground"
                    : "text-foreground",
                )}
              >
                {formatCount(count)}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
