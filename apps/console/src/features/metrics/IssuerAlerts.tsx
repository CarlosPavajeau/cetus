import { Link } from "@tanstack/react-router";
import { TriangleAlertIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Progress, ProgressLabel, ProgressValue } from "~/components/ui/progress";
import { documentTypeLabel } from "~/features/documents/labels";
import { formatCount } from "~/features/usage/labels";
import type { IssuerAlerts as Alerts, RangeAlert } from "~/lib/api/types";
import { cn } from "~/lib/utils";

import { formatDayLong, formatInstantLong } from "./labels";

type Warning = {
  key: string;
  issuerId: string;
  /** Already stops issuing, not only about to. */
  blocking: boolean;
  text: string;
  action: string;
};

/** What stops issuing soon: expiring certificates, and ranges running out or whose resolution ends. */
export function IssuerWarnings({ alerts }: { alerts: Alerts }) {
  const warnings = warningsOf(alerts);
  if (warnings.length === 0) {
    return null;
  }

  return (
    <Alert variant={warnings.some((warning) => warning.blocking) ? "destructive" : "default"}>
      <TriangleAlertIcon />
      <AlertTitle>Renueva a tiempo para no detener tu facturación</AlertTitle>
      <AlertDescription>
        <ul className="flex flex-col gap-1">
          {warnings.map((warning) => (
            <li key={warning.key}>
              {warning.text}{" "}
              <Link to="/issuers/$issuerId" params={{ issuerId: warning.issuerId }}>
                {warning.action}
              </Link>
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}

function warningsOf(alerts: Alerts): Warning[] {
  const certificates = alerts.certificates.map((certificate) => {
    const when = formatInstantLong(certificate.validTo);
    const expired = certificate.daysLeft < 0;
    return {
      key: `certificate-${certificate.issuerId}`,
      issuerId: certificate.issuerId,
      blocking: expired,
      text: expired
        ? `El certificado de ${certificate.issuerName} venció el ${when}.`
        : `El certificado de ${certificate.issuerName} vence el ${when} (${daysText(certificate.daysLeft)}).`,
      action: "Cargar un certificado nuevo",
    };
  });
  const ranges = alerts.ranges.flatMap((range) => {
    const name = `${rangeName(range)} de ${range.issuerName}`;
    const running: Warning[] = range.runningOut
      ? [
          {
            key: `range-${range.id}-numbers`,
            issuerId: range.issuerId,
            blocking: range.used >= range.total,
            text: `${remainingText(range.total - range.used)} en ${name}: solicita una nueva resolución a la DIAN.`,
            action: "Ver emisor",
          },
        ]
      : [];
    const expiring: Warning[] =
      range.expiring && range.validTo !== null && range.daysLeft !== null
        ? [
            {
              key: `range-${range.id}-resolution`,
              issuerId: range.issuerId,
              blocking: range.daysLeft < 0,
              text:
                range.daysLeft < 0
                  ? `La resolución de ${name} venció el ${formatDayLong(range.validTo)}.`
                  : `La resolución de ${name} vence el ${formatDayLong(range.validTo)} (${daysText(range.daysLeft)}).`,
              action: "Ver emisor",
            },
          ]
        : [];
    return [...running, ...expiring];
  });
  return [...certificates, ...ranges];
}

/** How much of each active numbering range is used, the ones that need attention first. */
export function NumberingUsage({ ranges }: { ranges: RangeAlert[] }) {
  const sorted = ranges.toSorted((a, b) => Number(needsAttention(b)) - Number(needsAttention(a)));
  const [first] = ranges;
  const issuer = ranges.every((range) => range.issuerId === first?.issuerId) ? first : undefined;
  const linkClass =
    "text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline";

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Numeración</CardTitle>
        <CardDescription>
          {issuer === undefined
            ? "Números usados de cada rango activo."
            : `Números usados de cada rango activo de ${issuer.issuerName}.`}
        </CardDescription>
        <CardAction>
          {issuer === undefined ? (
            <Link to="/issuers" className={linkClass}>
              Ver emisores
            </Link>
          ) : (
            <Link
              to="/issuers/$issuerId"
              params={{ issuerId: issuer.issuerId }}
              className={linkClass}
            >
              Ver emisor
            </Link>
          )}
        </CardAction>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-4">
          {sorted.map((range) => (
            <RangeUsage key={range.id} range={range} issuerShown={issuer === undefined} />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function RangeUsage({ range, issuerShown }: { range: RangeAlert; issuerShown: boolean }) {
  const attention = needsAttention(range);
  const details = [
    range.runningOut ? `${remainingText(range.total - range.used)}.` : null,
    resolutionText(range),
  ].filter((detail) => detail !== null);

  return (
    <li className="flex flex-col gap-1">
      <Progress
        value={range.used}
        max={range.total}
        variant={attention ? "destructive" : "default"}
      >
        <ProgressLabel>
          {rangeName(range)}
          {issuerShown && (
            <>
              {" "}
              <Link
                to="/issuers/$issuerId"
                params={{ issuerId: range.issuerId }}
                className="font-normal text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                {range.issuerName}
              </Link>
            </>
          )}
        </ProgressLabel>
        <ProgressValue>
          {() => `${formatCount(range.used)} de ${formatCount(range.total)}`}
        </ProgressValue>
      </Progress>
      {details.length > 0 && (
        <p
          className={cn(
            "text-2xs text-muted-foreground",
            attention && "font-medium text-destructive-foreground",
          )}
        >
          {details.join(" ")}
        </p>
      )}
    </li>
  );
}

function needsAttention(range: RangeAlert) {
  return range.runningOut || range.expiring;
}

function rangeName(range: RangeAlert) {
  return `${documentTypeLabel[range.documentType]} ${range.prefix ?? ""}`.trim();
}

function resolutionText(range: RangeAlert) {
  if (range.validTo === null || range.daysLeft === null) {
    return null;
  }
  if (range.daysLeft < 0) {
    return `Resolución vencida el ${formatDayLong(range.validTo)}.`;
  }
  return range.expiring
    ? `Resolución vigente hasta el ${formatDayLong(range.validTo)} (${daysText(range.daysLeft)}).`
    : `Resolución vigente hasta el ${formatDayLong(range.validTo)}.`;
}

const plural = new Intl.PluralRules("es-CO");

function remainingText(numbers: number) {
  const left = Math.max(0, numbers);
  return plural.select(left) === "one"
    ? `Queda ${formatCount(left)} número`
    : `Quedan ${formatCount(left)} números`;
}

function daysText(days: number) {
  if (days === 0) {
    return "hoy";
  }
  return days === 1 ? "en 1 día" : `en ${formatCount(days)} días`;
}
