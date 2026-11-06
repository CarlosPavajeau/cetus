import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { issuerName } from "~/features/issuers/labels";
import { formatCount } from "~/features/usage/labels";
import type {
  CertificateAlert,
  Environment,
  Issuer,
  IssuerMetrics,
  RangeAlert,
} from "~/lib/api/types";
import { cn } from "~/lib/utils";

import { daysText, rangeName, rangeTone } from "./IssuerAlerts";
import { formatAmount, formatInstantShort } from "./labels";
import type { DateRange } from "./periods";
import { issuerMetricsQuery } from "./queries";

type Tone = ReturnType<typeof rangeTone>;

/** A cell's value; {@code muted} when it only says there is nothing to show. */
type Figure = { value: string; detail: string | null; tone: Tone; muted: boolean };

type Row = {
  issuer: Issuer;
  total: number;
  documents: Figure;
  rejected: number;
  amount: Figure;
  numbering: Figure;
  certificate: Figure;
  tone: Tone;
};

const toneRank: Record<Tone, number> = { destructive: 2, warning: 1, default: 0 };

const toneText: Record<Tone, string> = {
  default: "",
  warning: "text-warning-foreground",
  destructive: "text-destructive-foreground",
};

/**
 * Each issuer's period on its own row, so several companies' amounts are never added up, next to what stops
 * each one issuing soon. A row narrows the overview to its issuer.
 */
export function IssuerBreakdown({
  environment,
  range,
  issuers,
  certificates,
  ranges,
}: {
  environment: Environment;
  range: DateRange;
  issuers: Issuer[];
  certificates: CertificateAlert[];
  ranges: RangeAlert[];
}) {
  const { data: metrics } = useSuspenseQuery(issuerMetricsQuery(environment, range));
  const sandbox = environment === "SANDBOX";
  const rows = issuers
    .flatMap((issuer) => {
      const issuerMetrics = metrics.find((each) => each.issuerId === issuer.id);
      return issuerMetrics === undefined
        ? []
        : [rowOf(issuer, issuerMetrics, certificates, ranges, sandbox)];
    })
    .toSorted(
      (a, b) =>
        toneRank[b.tone] - toneRank[a.tone] ||
        b.total - a.total ||
        issuerName(a.issuer).localeCompare(issuerName(b.issuer), "es"),
    );

  return (
    <section aria-labelledby="issuer-breakdown" className="flex flex-col gap-2">
      <h3 id="issuer-breakdown" className="text-sm font-medium">
        Por emisor
      </h3>
      <div className="hidden rounded-lg border sm:block">
        <Table>
          <TableCaption className="sr-only">
            Documentos, rechazos y monto de cada emisor en el periodo
            {sandbox ? "." : ", con su numeración restante y su certificado."}
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-3">Emisor</TableHead>
              <TableHead className="text-right">Documentos</TableHead>
              <TableHead className="text-right">Rechazos</TableHead>
              <TableHead className="text-right">Monto facturado</TableHead>
              {!sandbox && <TableHead className="pl-6">Numeración restante</TableHead>}
              {!sandbox && <TableHead className="pr-3">Certificado</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.issuer.id} className="relative">
                <TableCell className="py-2.5 pl-3">
                  <IssuerLink issuer={row.issuer} />
                  <p className="font-mono text-2xs text-muted-foreground">{nitOf(row.issuer)}</p>
                </TableCell>
                <FigureCell figure={row.documents} className="text-right" />
                <TableCell
                  className={cn(
                    "text-right tabular-nums",
                    row.rejected > 0
                      ? "font-medium text-destructive-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  {row.rejected > 0 ? formatCount(row.rejected) : "—"}
                </TableCell>
                <FigureCell figure={row.amount} className="text-right" />
                {!sandbox && <FigureCell figure={row.numbering} className="pl-6" />}
                {!sandbox && <FigureCell figure={row.certificate} className="pr-3" />}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <ul className="flex flex-col divide-y rounded-lg border sm:hidden">
        {rows.map((row) => (
          <li key={row.issuer.id} className="relative flex flex-col gap-1 p-3">
            <div className="flex items-baseline justify-between gap-3">
              <IssuerLink issuer={row.issuer} />
              <span className={cn("shrink-0 text-sm tabular-nums", toneText[row.amount.tone])}>
                {row.amount.value}
              </span>
            </div>
            <p className="text-2xs text-muted-foreground tabular-nums">
              {row.total === 1 ? "1 documento" : `${row.documents.value} documentos`}
              {" · "}
              {row.rejected === 0 ? (
                "sin rechazos"
              ) : (
                <span className="font-medium text-destructive-foreground">
                  {row.rejected === 1 ? "1 rechazo" : `${formatCount(row.rejected)} rechazos`}
                </span>
              )}
            </p>
            {!sandbox && (
              <p className="text-2xs text-muted-foreground">
                <span className={toneText[row.numbering.tone]}>
                  Numeración: {row.numbering.value}
                </span>
                {" · "}
                <span className={toneText[row.certificate.tone]}>
                  Certificado: {row.certificate.value}
                </span>
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The issuer's name, stretched over its whole row so the row narrows the overview to it. */
function IssuerLink({ issuer }: { issuer: Issuer }) {
  return (
    <Link
      to="/overview"
      search={(previous) => ({ ...previous, issuer: issuer.id })}
      resetScroll={false}
      className="font-medium outline-none after:absolute after:inset-0 after:rounded-[inherit] hover:underline hover:underline-offset-4 focus-visible:after:ring-3 focus-visible:after:ring-ring/50 focus-visible:after:ring-inset"
    >
      {issuerName(issuer)}
    </Link>
  );
}

function FigureCell({ figure, className }: { figure: Figure; className?: string }) {
  return (
    <TableCell className={cn("py-2.5 tabular-nums", className)}>
      <p
        className={cn(
          figure.tone !== "default" && "font-medium",
          toneText[figure.tone],
          figure.muted && "text-muted-foreground",
        )}
      >
        {figure.value}
      </p>
      {figure.detail !== null && (
        <p
          className={cn(
            "text-2xs",
            figure.tone === "default" ? "text-muted-foreground" : toneText[figure.tone],
          )}
        >
          {figure.detail}
        </p>
      )}
    </TableCell>
  );
}

function rowOf(
  issuer: Issuer,
  metrics: IssuerMetrics,
  certificates: CertificateAlert[],
  ranges: RangeAlert[],
  sandbox: boolean,
): Row {
  const numbering = sandbox
    ? figureOf("—")
    : numberingOf(ranges.filter((range) => range.issuerId === issuer.id));
  const certificate = sandbox
    ? figureOf("—")
    : certificateOf(
        metrics.certificate,
        certificates.some((alert) => alert.issuerId === issuer.id),
      );
  const tone = [numbering.tone, certificate.tone].reduce((worst, each) =>
    toneRank[each] > toneRank[worst] ? each : worst,
  );
  return {
    issuer,
    total: metrics.totals.total,
    documents: figureOf(
      formatCount(metrics.totals.total),
      metrics.totals.inProgress > 0 ? `${formatCount(metrics.totals.inProgress)} en curso` : null,
    ),
    rejected: metrics.totals.rejected,
    amount: amountOf(metrics.amounts),
    numbering,
    certificate,
    tone,
  };
}

function figureOf(value: string, detail: string | null = null, tone: Tone = "default"): Figure {
  return { value, detail, tone, muted: false };
}

function emptyOf(value: string): Figure {
  return { value, detail: null, tone: "default", muted: true };
}

function amountOf(amounts: IssuerMetrics["amounts"]): Figure {
  const [first, ...others] = amounts;
  if (first === undefined) {
    return emptyOf(formatAmount(0, "COP"));
  }
  return figureOf(
    formatAmount(first.net, first.currency),
    others.length > 0
      ? `Y ${others.map((each) => formatAmount(each.net, each.currency)).join(", ")}`
      : null,
  );
}

/** The range closest to stopping the issuer: the most urgent, then the most used, as the alerts measure it. */
function numberingOf(ranges: RangeAlert[]): Figure {
  const [scarcest, ...others] = ranges.toSorted(
    (a, b) =>
      toneRank[rangeTone(b)] - toneRank[rangeTone(a)] || b.used / b.total - a.used / a.total,
  );
  if (scarcest === undefined) {
    return emptyOf("Sin rangos");
  }
  const left = Math.max(0, scarcest.total - scarcest.used);
  const resolution =
    scarcest.daysLeft === null
      ? null
      : scarcest.daysLeft < 0
        ? "resolución vencida"
        : scarcest.expiring
          ? `resolución vence ${daysText(scarcest.daysLeft)}`
          : null;
  const more =
    others.length === 0 ? null : others.length === 1 ? "+1 rango" : `+${others.length} rangos`;
  return figureOf(
    `Quedan ${formatCount(left)}`,
    [rangeName(scarcest), resolution, more].filter((part) => part !== null).join(" · "),
    rangeTone(scarcest),
  );
}

/** Amber while the alerts count it as expiring soon, red once it expired. */
function certificateOf(certificate: IssuerMetrics["certificate"], expiring: boolean): Figure {
  if (certificate === null) {
    return emptyOf("Sin certificado");
  }
  const date = formatInstantShort(certificate.validTo);
  if (certificate.daysLeft < 0) {
    return figureOf(`Venció el ${date}`, "Carga uno nuevo para seguir emitiendo", "destructive");
  }
  return expiring
    ? figureOf(`Vence el ${date}`, daysText(certificate.daysLeft), "warning")
    : figureOf(`Vence el ${date}`);
}

function nitOf(issuer: Issuer) {
  return `NIT ${issuer.nit}-${issuer.checkDigit}`;
}
