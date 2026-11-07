import { Link } from "@tanstack/react-router";
import { TriangleAlertIcon } from "lucide-react";
import { useId } from "react";

import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { buttonVariants } from "~/components/ui/button";
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
import { issuerName, issuerNit } from "~/features/issuers/labels";
import { formatCount } from "~/features/usage/labels";
import type { IssuerAlerts as Alerts, Issuer, RangeAlert } from "~/lib/api/types";
import { cn } from "~/lib/utils";

import { formatDayLong, formatInstantLong } from "./labels";

type Warning = {
  key: string;
  issuerId: string;
  issuerName: string;
  /** Already stops issuing, not only about to. */
  blocking: boolean;
  text: string;
};

/** One issuer's warnings, under its name and NIT, since an accountant tells their clients apart by NIT. */
type Group = {
  issuerId: string;
  name: string;
  nit: string | null;
  blocking: boolean;
  warnings: Warning[];
};

/**
 * What stops issuing soon, by issuer: expiring certificates, and ranges running out or whose resolution ends. The
 * issuers that already stopped get their own red alert, so they do not turn the others' amber warnings red. They are
 * sections, not alerts: they come with the page and render again on every filter change, so an alert role would read
 * them out each time. With {@code summarized}, the issuer breakdown already lists each one's certificate and
 * numbering, so the warnings only count the issuers and point to it.
 */
export function IssuerWarnings({
  alerts,
  issuers,
  manage,
  summarized,
}: {
  alerts: Alerts;
  issuers: Issuer[];
  manage: boolean;
  summarized: boolean;
}) {
  const blockingId = useId();
  const pendingId = useId();
  const groups = groupsOf(alerts, issuers, manage);
  const blocking = groups.filter((group) => group.blocking);
  const pending = groups.filter((group) => !group.blocking);

  if (summarized && groups.length > 0) {
    return <WarningSummary blocking={blocking.length} pending={pending.length} />;
  }

  return (
    <>
      {blocking.length > 0 && (
        <section aria-labelledby={blockingId}>
          <Alert variant="destructive" live={false}>
            <AlertTitle>
              <h2 id={blockingId}>Renueva para volver a facturar</h2>
            </AlertTitle>
            <AlertDescription>
              <WarningGroups groups={blocking} />
            </AlertDescription>
          </Alert>
        </section>
      )}
      {pending.length > 0 && (
        <section aria-labelledby={pendingId}>
          <Alert variant="warning">
            <TriangleAlertIcon aria-hidden="true" />
            <AlertTitle>
              <h2 id={pendingId}>Renueva a tiempo para no detener tu facturación</h2>
            </AlertTitle>
            <AlertDescription>
              <WarningGroups groups={pending} />
            </AlertDescription>
          </Alert>
        </section>
      )}
    </>
  );
}

function WarningSummary({ blocking, pending }: { blocking: number; pending: number }) {
  const titleId = useId();
  const title =
    blocking === 0
      ? `${issuersText(pending, "")} ${pending === 1 ? "necesita" : "necesitan"} atención pronto`
      : `${issuersText(blocking, "")} ya no ${blocking === 1 ? "puede" : "pueden"} facturar`;

  return (
    <section aria-labelledby={titleId}>
      <Alert variant={blocking > 0 ? "destructive" : "warning"} live={false}>
        {blocking === 0 && <TriangleAlertIcon aria-hidden="true" />}
        <AlertTitle>
          <h2 id={titleId}>{title}</h2>
        </AlertTitle>
        <AlertDescription>
          <p>
            {blocking > 0 &&
              pending > 0 &&
              `Y ${issuersText(pending, " más")} ${pending === 1 ? "necesita" : "necesitan"} atención pronto. `}
            Su certificado y su numeración están en la tabla por emisor.{" "}
            <a href="#issuer-breakdown">Ver por emisor</a>
          </p>
        </AlertDescription>
      </Alert>
    </section>
  );
}

function WarningGroups({ groups }: { groups: Group[] }) {
  return (
    <ul className="mt-1.5 flex flex-col gap-3">
      {groups.map((group) => (
        <li key={group.issuerId} className="flex flex-col gap-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <h3 className="font-medium">{group.name}</h3>
            {group.nit !== null && (
              <span className="font-mono text-2xs opacity-80">{group.nit}</span>
            )}
            <Link
              to="/issuers/$issuerId"
              params={{ issuerId: group.issuerId }}
              aria-label={`Ver emisor ${group.name}`}
              className="text-xs"
            >
              Ver emisor
            </Link>
          </div>
          <ul className="flex list-disc flex-col gap-0.5 pl-4">
            {group.warnings.map((warning) => (
              <li key={warning.key}>{warning.text}</li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}

function groupsOf(alerts: Alerts, issuers: Issuer[], manage: boolean): Group[] {
  const groups = new Map<string, Group>();
  // Blocking warnings first puts them first within their issuer.
  const warnings = warningsOf(alerts, manage).toSorted(
    (a, b) => Number(b.blocking) - Number(a.blocking),
  );
  for (const warning of warnings) {
    const group = groups.get(warning.issuerId);
    if (group === undefined) {
      const issuer = issuers.find((each) => each.id === warning.issuerId);
      groups.set(warning.issuerId, {
        issuerId: warning.issuerId,
        name: issuer === undefined ? warning.issuerName : issuerName(issuer),
        nit: issuer === undefined ? null : issuerNit(issuer),
        blocking: warning.blocking,
        warnings: [warning],
      });
    } else {
      group.blocking ||= warning.blocking;
      group.warnings.push(warning);
    }
  }
  return [...groups.values()];
}

function warningsOf(alerts: Alerts, manage: boolean): Warning[] {
  const upload = manage ? "carga uno nuevo" : "pide a un administrador que cargue uno nuevo";
  const request = manage
    ? "solicita una nueva resolución a la DIAN"
    : "pide a un administrador que solicite una nueva resolución a la DIAN";
  const certificates = alerts.certificates.map((certificate) => {
    const when = formatInstantLong(certificate.validTo);
    const expired = certificate.daysLeft < 0;
    return {
      key: `certificate-${certificate.issuerId}`,
      issuerId: certificate.issuerId,
      issuerName: certificate.issuerName,
      blocking: expired,
      text: expired
        ? `El certificado de firma venció el ${when}: ${upload}.`
        : `El certificado de firma vence el ${when} (${daysText(certificate.daysLeft)}): ${upload}.`,
    };
  });
  const ranges = alerts.ranges.flatMap((range) => {
    const name = rangeName(range);
    const running: Warning[] = range.runningOut
      ? [
          {
            key: `range-${range.id}-numbers`,
            issuerId: range.issuerId,
            issuerName: range.issuerName,
            blocking: range.used >= range.total,
            text: `${remainingText(range.total - range.used)} en ${name}: ${request}.`,
          },
        ]
      : [];
    const expiring: Warning[] =
      range.expiring && range.validTo !== null && range.daysLeft !== null
        ? [
            {
              key: `range-${range.id}-resolution`,
              issuerId: range.issuerId,
              issuerName: range.issuerName,
              blocking: range.daysLeft < 0,
              text:
                range.daysLeft < 0
                  ? `La resolución de ${name} venció el ${formatDayLong(range.validTo)}.`
                  : `La resolución de ${name} vence el ${formatDayLong(range.validTo)} (${daysText(range.daysLeft)}).`,
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
  const linkClass = cn(buttonVariants({ variant: "outline", size: "sm" }));

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle level={3}>Numeración</CardTitle>
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
        <ul className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((range) => (
            <RangeUsage key={range.id} range={range} issuerShown={issuer === undefined} />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function RangeUsage({ range, issuerShown }: { range: RangeAlert; issuerShown: boolean }) {
  const tone = rangeTone(range);
  const details = [
    range.runningOut ? `${remainingText(range.total - range.used)}.` : null,
    resolutionText(range),
  ].filter((detail) => detail !== null);

  return (
    <li className="flex flex-col gap-1">
      <Progress value={range.used} max={range.total} variant={tone}>
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
            tone === "warning" && "font-medium text-warning-foreground",
            tone === "destructive" && "font-medium text-destructive-foreground",
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

/** Red only once the range already stops issuing; amber while there is still time to act. */
export function rangeTone(range: RangeAlert): "default" | "warning" | "destructive" {
  if (range.used >= range.total || (range.daysLeft !== null && range.daysLeft < 0)) {
    return "destructive";
  }
  return needsAttention(range) ? "warning" : "default";
}

/** Without a prefix, an issuer's ranges of one document type differ only in their numbers. */
export function rangeName(range: RangeAlert) {
  const type = documentTypeLabel[range.documentType];
  return range.prefix === null
    ? `${type} ${formatCount(range.numberFrom)}–${formatCount(range.numberTo)}`
    : `${type} ${range.prefix}`;
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

function issuersText(count: number, suffix: string) {
  return plural.select(count) === "one"
    ? `${formatCount(count)} emisor${suffix}`
    : `${formatCount(count)} emisores${suffix}`;
}

function remainingText(numbers: number) {
  const left = Math.max(0, numbers);
  return plural.select(left) === "one"
    ? `Queda ${formatCount(left)} número`
    : `Quedan ${formatCount(left)} números`;
}

export function daysText(days: number) {
  if (days === 0) {
    return "hoy";
  }
  return days === 1 ? "en 1 día" : `en ${formatCount(days)} días`;
}
