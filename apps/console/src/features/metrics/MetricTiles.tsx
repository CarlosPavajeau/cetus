import { Link } from "@tanstack/react-router";

import { formatCount } from "~/features/usage/labels";
import type { DocumentStatus, Metrics } from "~/lib/api/types";

import { formatAmount, formatDuration, formatPercent } from "./labels";

function Tile({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-lg border p-3">
      <dt className="text-2xs text-muted-foreground">{label}</dt>
      <dd className="text-lg font-medium tabular-nums">{value}</dd>
      <dd className="text-2xs text-muted-foreground">{detail}</dd>
    </div>
  );
}

/** The period's documents, how many the DIAN accepted, what they add up to and how long the DIAN took. */
export function MetricTiles({ metrics }: { metrics: Metrics }) {
  const { totals, acceptanceRate, amounts, validation } = metrics;
  const [amount, ...others] = amounts;

  return (
    <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Tile
        label="Documentos"
        value={formatCount(totals.total)}
        detail={
          totals.inProgress > 0 ? `${formatCount(totals.inProgress)} en curso` : "Ninguno en curso"
        }
      />
      <Tile
        label="Tasa de aceptación"
        value={acceptanceRate === null ? "—" : formatPercent(acceptanceRate)}
        detail={`${formatCount(totals.accepted)} aceptados de ${formatCount(totals.accepted + totals.rejected)} con respuesta`}
      />
      <Tile
        label="Monto facturado"
        value={amount ? formatAmount(amount.net, amount.currency) : formatAmount(0, "COP")}
        detail={
          others.length > 0
            ? `Y ${others.map((each) => formatAmount(each.net, each.currency)).join(", ")}`
            : "Facturas y notas débito, menos notas crédito"
        }
      />
      <Tile
        label="Tiempo hasta la validación"
        value={validation.secondsAverage === null ? "—" : formatDuration(validation.secondsAverage)}
        detail={
          validation.secondsP95 === null
            ? "Sin respuestas de la DIAN"
            : `Promedio · 95 % en menos de ${formatDuration(validation.secondsP95)}`
        }
      />
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

/** Each final outcome of the period, linked to the documents behind it. */
export function OutcomeLinks({ metrics }: { metrics: Metrics }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
      {outcomes.map((outcome) => (
        <li key={outcome.status}>
          <Link
            to="/documents"
            search={{ status: outcome.status, from: metrics.from, to: metrics.to }}
            className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            {outcome.label}:{" "}
            <span className="font-medium text-foreground tabular-nums">
              {formatCount(metrics.totals[outcome.key])}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
