import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { formatCount } from "~/features/usage/labels";
import type { DocumentStatus, Metrics } from "~/lib/api/types";
import { cn } from "~/lib/utils";

import { formatAmount, formatDuration, formatPercent } from "./labels";

/** A card from sm up; on phones a ledger row, label left and value right, so the tiles leave room for the chart. */
function Tile({
  label,
  value,
  detail,
  note,
}: {
  label: string;
  value: ReactNode;
  detail: ReactNode;
  note?: string;
}) {
  return (
    <div className="grid min-w-0 grid-cols-[1fr_auto] items-baseline gap-x-3 gap-y-1 rounded-lg border px-3 py-2.5 sm:flex sm:flex-col sm:py-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-xl font-medium tracking-tight tabular-nums sm:text-2xl">{value}</dd>
      <dd className="col-span-2 text-xs text-pretty text-muted-foreground">{detail}</dd>
      {note && <dd className="col-span-2 text-xs text-pretty text-muted-foreground">{note}</dd>}
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
  const sampleSmall = answered > 0 && answered < sampleAnsweredMin;

  return (
    <dl
      className={cn(
        "grid gap-2 sm:grid-cols-2 sm:gap-3",
        columnsByCount[2 + Number(amountShown) + Number(!simulated)],
      )}
    >
      <Tile
        label="Documentos"
        value={formatCount(totals.total)}
        detail={
          totals.inProgress > 0 ? `${formatCount(totals.inProgress)} en curso` : "Ninguno en curso"
        }
      />
      <Tile
        label="Tasa de aceptación"
        value={
          sampleSmall ? (
            <>
              {formatCount(totals.accepted)}
              <span className="mx-0.5 text-sm font-normal whitespace-pre text-muted-foreground">
                {" de "}
              </span>
              {formatCount(answered)}
            </>
          ) : acceptanceRate === null ? (
            "—"
          ) : (
            formatPercent(acceptanceRate)
          )
        }
        detail={<OutcomeLinks metrics={metrics} issuerId={issuerId} />}
        note={sampleSmall ? `El porcentaje aparece con ${sampleAnsweredMin} respuestas` : undefined}
      />
      {amountShown && (
        <Tile
          label="Monto facturado"
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
                  "tabular-nums",
                  count === 0
                    ? "text-muted-foreground"
                    : outcome.key === "rejected"
                      ? "font-medium text-destructive-foreground"
                      : "font-medium text-foreground",
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
