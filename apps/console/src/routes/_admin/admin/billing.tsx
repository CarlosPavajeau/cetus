import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";

import { Entry, Section } from "~/components/DetailSection";
import { PageHeader } from "~/components/PageHeader";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Spinner } from "~/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { refreshReconciliation } from "~/features/admin/billing";
import { adminKey, reconciliationQuery } from "~/features/admin/queries";
import { formatCents, orderStatusLabel, reversalKindLabel } from "~/features/billing/labels";
import type { ReconciliationIssue } from "~/lib/api/types";

const monthPattern = /^20\d{2}-(0[1-9]|1[0-2])$/;

/** The month in Colombia, as "2026-10". */
function currentMonth() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
  }).format(new Date());
}

const issueLabel: Record<ReconciliationIssue, string> = {
  PAYMENT_MISSING: "Pagada sin transacción aprobada",
  PAYMENT_AMOUNT_MISMATCH: "Wompi cobró otro monto",
  PAYMENT_DUPLICATE: "Pagada dos veces",
  PAYMENT_UNMATCHED: "Pago aprobado de una orden sin pagar",
  INVOICE_MISSING: "Sin factura aceptada",
  CREDIT_NOTE_MISSING: "Sin nota crédito aceptada",
  REFUND_UNRESOLVED: "Reembolso sin respuesta de Wompi",
  REVIEW_PENDING: "Pago en revisión",
};

export const Route = createFileRoute("/_admin/admin/billing")({
  validateSearch: (search: Record<string, unknown>): { month: string } => ({
    month:
      typeof search.month === "string" && monthPattern.test(search.month)
        ? search.month
        : currentMonth(),
  }),
  loaderDeps: ({ search }) => search,
  loader: ({ context: { queryClient }, deps }) =>
    queryClient.query({ ...reconciliationQuery(deps.month), staleTime: "static" }),
  component: BillingReconciliation,
});

function BillingReconciliation() {
  const { month } = Route.useSearch();
  const { platformRole } = Route.useRouteContext();
  const navigate = useNavigate({ from: Route.fullPath });
  const queryClient = useQueryClient();
  const { data: report } = useSuspenseQuery(reconciliationQuery(month));
  const refresh = useMutation({
    mutationFn: () => refreshReconciliation({ data: { month } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [...adminKey, "reconciliation"] }),
  });

  return (
    <>
      <PageHeader
        title="Conciliación"
        lead="Las órdenes del mes (hora de Colombia) frente a las transacciones de Wompi, las facturas y las notas crédito. Muestra lo que Cetus tiene guardado; consultar Wompi de nuevo actualiza los pagos en unos minutos."
        action={
          <div className="flex items-center gap-2">
            <Input
              type="month"
              aria-label="Mes"
              value={month}
              onChange={(event) => {
                if (monthPattern.test(event.target.value)) {
                  void navigate({ search: { month: event.target.value } });
                }
              }}
              className="w-40"
            />
            {platformRole === "admin" && (
              <Button
                variant="outline"
                disabled={refresh.isPending}
                onClick={() => refresh.mutate()}
              >
                {refresh.isPending && <Spinner data-icon="inline-start" />}
                Consultar Wompi de nuevo
              </Button>
            )}
          </div>
        }
      />

      {refresh.isSuccess && (
        <Alert>
          <AlertDescription>
            {`Se consultan ${refresh.data.ordersChecked} órdenes en Wompi. Recarga en unos minutos para ver sus respuestas.`}
          </AlertDescription>
        </Alert>
      )}
      {refresh.isError && (
        <Alert variant="destructive">
          <AlertDescription>{refresh.error.message}</AlertDescription>
        </Alert>
      )}

      <Section id="reconciliation-totals" title="Totales">
        <dl className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <Entry label="Pagado">{formatCents(report.paidCents)}</Entry>
          <Entry label="Devuelto">{formatCents(report.reversedCents)}</Entry>
          <Entry label="Neto">{formatCents(report.netCents)}</Entry>
          <Entry label="Facturado">{formatCents(report.invoicedCents)}</Entry>
          <Entry label="Acreditado">{formatCents(report.creditedCents)}</Entry>
          <Entry label="Órdenes con diferencias">{report.ordersWithIssues}</Entry>
        </dl>
      </Section>

      <Section id="reconciliation-orders" title={`Órdenes (${report.orders.length})`}>
        {report.orders.length === 0 ? (
          <p className="text-xs text-muted-foreground">No hay órdenes en este mes.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Orden</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Wompi</TableHead>
                <TableHead>Factura</TableHead>
                <TableHead>Devoluciones</TableHead>
                <TableHead>Diferencias</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.orders.map((order) => (
                <TableRow key={order.orderId}>
                  <TableCell className="align-top">
                    <div className="flex flex-col gap-0.5">
                      <Link
                        to="/admin/organizations/$accountId"
                        params={{ accountId: order.accountId }}
                        hash="account-orders"
                        className="w-fit text-xs hover:underline hover:underline-offset-4"
                      >
                        <code>{order.reference}</code>
                      </Link>
                      <span className="text-2xs text-muted-foreground">
                        {orderStatusLabel[order.status]}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right align-top text-xs tabular-nums">
                    {formatCents(order.totalCents)}
                  </TableCell>
                  <TableCell className="align-top">
                    <ul className="flex flex-col gap-0.5 text-2xs">
                      {order.payments.map((payment) => (
                        <li key={payment.transactionId}>
                          {`${payment.transactionId} · ${payment.status} · ${formatCents(payment.amountCents)}`}
                        </li>
                      ))}
                    </ul>
                  </TableCell>
                  <TableCell className="align-top text-2xs">
                    {order.invoice ? `${order.invoice.number} · ${order.invoice.status}` : "—"}
                  </TableCell>
                  <TableCell className="align-top">
                    <ul className="flex flex-col gap-0.5 text-2xs">
                      {order.reversals.map((reversal) => (
                        <li key={reversal.reference}>
                          {`${reversalKindLabel[reversal.kind]} ${formatCents(reversal.amountCents)} · ${reversal.status}`}
                          {reversal.creditNote &&
                            ` · ${reversal.creditNote.number} ${reversal.creditNote.status}`}
                        </li>
                      ))}
                    </ul>
                  </TableCell>
                  <TableCell className="align-top">
                    <div className="flex flex-wrap gap-1">
                      {order.issues.map((issue) => (
                        <Badge key={issue} variant="destructive">
                          {issueLabel[issue]}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Section>
    </>
  );
}
