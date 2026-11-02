import { Link } from "@tanstack/react-router";
import { TriangleAlertIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Progress, ProgressLabel, ProgressValue } from "~/components/ui/progress";
import { dateFormat } from "~/features/api-keys/formats";
import { documentTypeLabel } from "~/features/documents/labels";
import { formatCount } from "~/features/usage/labels";
import type { CertificateAlert, IssuerAlerts as Alerts, RangeAlert } from "~/lib/api/types";
import { cn } from "~/lib/utils";

import { formatDayLong, formatPercent } from "./labels";

/** The certificates about to expire and how much of each active numbering range is used. */
export function IssuerAlerts({ alerts }: { alerts: Alerts }) {
  const warnings =
    alerts.certificates.length +
    alerts.ranges.filter((range) => range.runningOut || range.expiring).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Certificados y numeración</CardTitle>
        <CardDescription>
          {warnings > 0
            ? "Renueva lo que está por vencer o agotarse antes de que detenga tu facturación."
            : "Tus certificados y rangos de numeración están al día."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {alerts.certificates.map((certificate) => (
          <CertificateWarning key={certificate.issuerId} certificate={certificate} />
        ))}
        {alerts.ranges.map((range) => (
          <RangeUsage key={range.id} range={range} />
        ))}
      </CardContent>
    </Card>
  );
}

function CertificateWarning({ certificate }: { certificate: CertificateAlert }) {
  const expired = certificate.daysLeft < 0;
  const when = dateFormat.format(new Date(certificate.validTo));

  return (
    <Alert variant={expired ? "destructive" : "default"}>
      <TriangleAlertIcon />
      <AlertTitle>
        {expired
          ? `El certificado de ${certificate.issuerName} venció`
          : `El certificado de ${certificate.issuerName} vence pronto`}
      </AlertTitle>
      <AlertDescription>
        {expired ? `Venció el ${when}.` : `Vence el ${when} (${daysText(certificate.daysLeft)}).`}{" "}
        <Link
          to="/issuers/$issuerId"
          params={{ issuerId: certificate.issuerId }}
          className="underline underline-offset-4"
        >
          Cargar un certificado nuevo
        </Link>
      </AlertDescription>
    </Alert>
  );
}

function RangeUsage({ range }: { range: RangeAlert }) {
  const name = `${documentTypeLabel[range.documentType]} ${range.prefix ?? ""}`.trim();

  return (
    <div className="flex flex-col gap-1">
      <Link
        to="/issuers/$issuerId"
        params={{ issuerId: range.issuerId }}
        className="self-start text-xs font-medium underline-offset-4 hover:underline"
      >
        {range.issuerName}
      </Link>
      <Progress value={range.used} max={range.total}>
        <ProgressLabel>{name}</ProgressLabel>
        <ProgressValue>
          {() =>
            `${formatCount(range.used)} de ${formatCount(range.total)} (${formatPercent(range.used / range.total)})`
          }
        </ProgressValue>
      </Progress>
      {range.runningOut && (
        <p className="text-2xs font-medium text-destructive-foreground">
          {`${remainingText(range.total - range.used)}: solicita una nueva resolución a la DIAN.`}
        </p>
      )}
      {range.validTo !== null && range.daysLeft !== null && (
        <p
          className={cn(
            "text-2xs text-muted-foreground",
            range.expiring && "font-medium text-destructive-foreground",
          )}
        >
          {range.daysLeft < 0
            ? `La resolución venció el ${formatDayLong(range.validTo)}.`
            : `La resolución vence el ${formatDayLong(range.validTo)} (${daysText(range.daysLeft)}).`}
        </p>
      )}
    </div>
  );
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
