import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";

import { Entry, Section } from "~/components/DetailSection";
import { PageHeader } from "~/components/PageHeader";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { buttonVariants } from "~/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { dateFormat, formatDateTime } from "~/features/api-keys/formats";
import { BillingProfileDialog } from "~/features/billing/BillingProfileDialog";
import { CreditsSummary } from "~/features/billing/CreditsSummary";
import {
  lotSourceLabel,
  lotStatusLabel,
  lotTitle,
  movementTypeLabel,
} from "~/features/billing/labels";
import {
  billingProfileQuery,
  creditsQuery,
  planOffersQuery,
  subscriptionQuery,
} from "~/features/billing/queries";
import {
  CancellationDialog,
  OverageLimitDialog,
  PlanNextDialog,
} from "~/features/billing/SubscriptionDialogs";
import { SubscriptionSummary } from "~/features/billing/SubscriptionSummary";
import { identificationTypeLabel } from "~/features/documents/labels";
import { useMemberPermissions } from "~/features/session/useMemberPermissions";
import { formatCount, periodLabel } from "~/features/usage/labels";
import { usageQuery } from "~/features/usage/queries";
import type { PlanOffer, PlanVersion } from "~/lib/api/types";
import { cn } from "~/lib/utils";

/** The account's subscription, its credits, its billing profile and its billable documents. */
export const Route = createFileRoute("/_app/billing/")({
  loader: async ({ context: { queryClient } }) => {
    await Promise.all([
      queryClient.query({ ...creditsQuery, staleTime: "static" }),
      queryClient.query({ ...subscriptionQuery, staleTime: "static" }),
      queryClient.query({ ...planOffersQuery, staleTime: "static" }),
      queryClient.query({ ...billingProfileQuery, staleTime: "static" }),
      queryClient.query({ ...usageQuery, staleTime: "static" }),
    ]);
    return { crumb: "Facturación" };
  },
  component: Billing,
});

function Billing() {
  const { data: credits } = useSuspenseQuery(creditsQuery);
  const { data: subscription } = useSuspenseQuery(subscriptionQuery);
  const { data: offers } = useSuspenseQuery(planOffersQuery);
  const { data: profile } = useSuspenseQuery(billingProfileQuery);
  const { data: usage } = useSuspenseQuery(usageQuery);
  const { session } = Route.useRouteContext();
  const { manage } = useMemberPermissions();
  const buyer = manage && !session.impersonatedBy;
  const graceStarted =
    subscription === null && credits.product && credits.available === 0 && credits.graceUsed > 0;
  const subscriptionOffers = offers.filter(
    (offer): offer is PlanOffer & { version: PlanVersion } =>
      offer.kind === "SUBSCRIPTION" && offer.version !== null && offer.version.totalCents > 0,
  );

  return (
    <>
      <PageHeader
        title="Facturación"
        lead="Cada documento que emites en producción usa un crédito: facturas, notas crédito y notas débito. Con una suscripción, los documentos por encima de los del mes se cobran como excedente. La simulación y las pruebas de habilitación no usan créditos."
      />

      {!credits.product && (
        <Alert>
          <AlertTitle>No tienes una suscripción ni un paquete vigente</AlertTitle>
          <AlertDescription>
            Para emitir en producción y agregar emisores de producción necesitas una suscripción
            mensual o un paquete anual. Las notas crédito siempre se pueden emitir.
          </AlertDescription>
        </Alert>
      )}
      {graceStarted && (
        <Alert variant="destructive">
          <AlertTitle>Se acabaron tus créditos</AlertTitle>
          <AlertDescription>
            Estás usando el margen de cortesía: {formatCount(credits.graceUsed)} de{" "}
            {formatCount(credits.graceMargin)} documentos. Al agotarlo, la emisión en producción se
            detiene. El siguiente paquete o recarga que compres los descuenta.
          </AlertDescription>
        </Alert>
      )}

      {subscription?.payBy && subscription.period.renewalOrderId && (
        <Alert variant="destructive">
          <AlertTitle>La renovación de tu suscripción está pendiente de pago</AlertTitle>
          <AlertDescription>
            {`Págala antes del ${formatDateTime(new Date(subscription.payBy))}. Mientras tanto puedes seguir emitiendo; si no se paga, la suscripción se cancela.`}
          </AlertDescription>
          <AlertAction>
            <Link
              to="/billing/orders/$orderId"
              params={{ orderId: subscription.period.renewalOrderId }}
              className={cn(buttonVariants({ size: "sm" }))}
            >
              Pagar renovación
            </Link>
          </AlertAction>
        </Alert>
      )}
      {subscription?.cancelAtPeriodEnd && (
        <Alert>
          <AlertTitle>Tu suscripción termina con este periodo</AlertTitle>
          <AlertDescription>
            {`No se renueva el ${dateFormat.format(new Date(subscription.period.endsAt))}. Puedes reanudarla antes de esa fecha.`}
          </AlertDescription>
        </Alert>
      )}

      {subscription && (
        <Section
          id="billing-subscription"
          title={`Suscripción ${subscription.planName}`}
          action={
            buyer && (
              <div className="flex flex-wrap gap-2">
                <OverageLimitDialog subscription={subscription} />
                {!subscription.cancelAtPeriodEnd && (
                  <PlanNextDialog subscription={subscription} offers={subscriptionOffers} />
                )}
                <CancellationDialog subscription={subscription} />
              </div>
            )
          }
        >
          <SubscriptionSummary subscription={subscription} />
        </Section>
      )}

      <Section
        id="billing-credits"
        title="Saldo"
        action={
          <div className="flex gap-2">
            <Link to="/billing/orders" className={cn(buttonVariants({ variant: "outline" }))}>
              Órdenes y facturas
            </Link>
            {subscription === null && (
              <Link to="/billing/products" className={cn(buttonVariants())}>
                Comprar créditos
              </Link>
            )}
          </div>
        }
      >
        <CreditsSummary credits={credits} />
      </Section>

      <Section id="billing-lots" title="Lotes de créditos">
        {credits.lots.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Todavía no tienes créditos. Contrata una suscripción o compra un paquete para emitir en
            producción.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lote</TableHead>
                <TableHead>Origen</TableHead>
                <TableHead className="text-right">Disponibles</TableHead>
                <TableHead>Vence</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {credits.lots.map((lot) => (
                <TableRow key={lot.id}>
                  <TableCell>{lotTitle(lot)}</TableCell>
                  <TableCell>{lotSourceLabel[lot.sourceType]}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {`${formatCount(lot.remaining)} de ${formatCount(lot.quantity)}`}
                  </TableCell>
                  <TableCell>{dateFormat.format(new Date(lot.expiresAt))}</TableCell>
                  <TableCell>{lotStatusLabel[lot.status]}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Section>

      <Section id="billing-movements" title="Movimientos recientes">
        {credits.movements.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin movimientos todavía.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Movimiento</TableHead>
                <TableHead className="text-right">Créditos</TableHead>
                <TableHead>Detalle</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {credits.movements.map((movement) => (
                <TableRow key={movement.id}>
                  <TableCell>{formatDateTime(new Date(movement.createdAt))}</TableCell>
                  <TableCell>{movementTypeLabel[movement.type]}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {movement.quantity > 0
                      ? `+${formatCount(movement.quantity)}`
                      : formatCount(movement.quantity)}
                  </TableCell>
                  <TableCell>
                    {movement.documentId ? (
                      <Link
                        to="/documents/$documentId"
                        params={{ documentId: movement.documentId }}
                        className="underline-offset-4 hover:underline"
                      >
                        Ver documento
                      </Link>
                    ) : (
                      (movement.reason ?? "")
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Section>

      <Section
        id="billing-profile"
        title="Perfil de facturación"
        action={buyer && <BillingProfileDialog profile={profile} />}
      >
        {profile === null ? (
          <p className="text-sm text-muted-foreground">
            Antes de la primera compra, indica a quién le emitimos la factura electrónica.
          </p>
        ) : (
          <dl className="grid gap-4 sm:grid-cols-3">
            <Entry label="Nombre o razón social">{profile.legalName}</Entry>
            <Entry label="Identificación">
              {`${identificationTypeLabel[profile.identificationType] ?? profile.identificationType} ${profile.identificationNumber}${profile.checkDigit ? `-${profile.checkDigit}` : ""}`}
            </Entry>
            <Entry label="Correo de facturación">{profile.email}</Entry>
          </dl>
        )}
      </Section>

      <Section id="billing-usage" title="Documentos facturables por mes">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mes</TableHead>
              <TableHead className="text-right">Documentos aceptados en producción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {usage.months.map((month) => (
              <TableRow key={month.period}>
                <TableCell>{periodLabel(month.period)}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCount(month.total)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <p className="text-xs text-muted-foreground">
          {`Solicitudes a la API en producción: ${formatCount(usage.requests.requestsPerSecond)} por segundo, hasta ${formatCount(usage.requests.requestsBurst)} de una vez${usage.requests.perKey ? ", por llave" : ""}.`}
        </p>
      </Section>
    </>
  );
}
