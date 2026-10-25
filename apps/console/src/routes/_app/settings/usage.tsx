import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { Entry, Section } from "~/components/DetailSection";
import { PageHeader } from "~/components/PageHeader";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  formatCount,
  periodLabel,
  planDocuments,
  planOverage,
  planPrice,
  planTitle,
} from "~/features/usage/labels";
import { PeriodUsageSummary } from "~/features/usage/PeriodUsageSummary";
import { usageQuery } from "~/features/usage/queries";

/** The account's plan and the billable documents of this month and the months before. */
export const Route = createFileRoute("/_app/settings/usage")({
  loader: async ({ context: { queryClient } }) => {
    await queryClient.ensureQueryData(usageQuery);
    return { crumb: "Plan y uso" };
  },
  component: Usage,
});

function Usage() {
  const { data: usage } = useSuspenseQuery(usageQuery);
  const { plan } = usage.current;
  const unassigned = plan.code === "FREE";

  return (
    <>
      <PageHeader
        title="Plan y uso"
        lead="Cuentan los documentos que la DIAN acepta en producción: facturas y notas. Las pruebas de habilitación y la simulación no cuentan."
      />

      {unassigned && (
        <Alert>
          <AlertTitle>Aún no tienes un plan</AlertTitle>
          <AlertDescription>
            Medimos tu uso sin límites mientras el equipo de Cetus te asigna uno. Escríbenos para
            elegir el plan que se ajuste a tu volumen.
          </AlertDescription>
        </Alert>
      )}

      <Section
        id="usage-plan"
        title={unassigned ? plan.name : `${planTitle(plan)} · ${planPrice(plan)}`}
      >
        <dl className="grid gap-4 sm:grid-cols-4">
          <Entry label="Documentos incluidos">{planDocuments(plan)}</Entry>
          <Entry label="Documentos adicionales">
            {planOverage(plan) ??
              (plan.documentsIncluded === null ? "No aplica" : "Según tu contrato")}
          </Entry>
          <Entry label="Emisores en producción">
            {plan.issuersIncluded === null
              ? formatCount(usage.issuersLive)
              : `${formatCount(usage.issuersLive)} de ${formatCount(plan.issuersIncluded)}`}
          </Entry>
          <Entry label="Solicitudes a la API en producción">
            {plan.requestsPerMinute === null
              ? "Límite estándar"
              : `${formatCount(plan.requestsPerMinute)} por minuto`}
          </Entry>
        </dl>
      </Section>

      <Section id="usage-month" title="Este mes">
        <PeriodUsageSummary usage={usage.current} />
      </Section>

      <Section id="usage-history" title="Últimos seis meses">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mes</TableHead>
              <TableHead className="text-right">Documentos facturables</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...usage.months].reverse().map((month) => (
              <TableRow key={month.period}>
                <TableCell>{periodLabel(month.period)}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCount(month.total)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Section>
    </>
  );
}
