import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { ReceiptIcon } from "lucide-react";
import { useEffect } from "react";

import { Entry, Section } from "~/components/DetailSection";
import { PageHeader } from "~/components/PageHeader";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { buttonVariants } from "~/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty";
import { Spinner } from "~/components/ui/spinner";
import { formatDateTime } from "~/features/api-keys/formats";
import { formatCents } from "~/features/billing/labels";
import { OrderInvoiceDownloads } from "~/features/billing/OrderInvoiceDownloads";
import { OrderStatusBadge } from "~/features/billing/OrderStatusBadge";
import { billingKey, orderQuery } from "~/features/billing/queries";
import type { Order } from "~/lib/api/types";
import { cn, uuidPattern } from "~/lib/utils";

const PENDING_REFRESH_MS = 3000;

/**
 * Where Wompi sends the customer back after paying. It only reads the order: Wompi confirms the payment to
 * Cetus on its own, and the order turns paid when it does.
 */
export const Route = createFileRoute("/_app/billing/orders/$orderId")({
  loader: async ({ context: { queryClient }, params }) => {
    if (!uuidPattern.test(params.orderId)) {
      throw notFound();
    }
    const order = await queryClient.query({ ...orderQuery(params.orderId), staleTime: "static" });
    if (!order) {
      throw notFound();
    }
    return { crumb: order.reference };
  },
  component: OrderPage,
  notFoundComponent: OrderNotFound,
});

function awaitingPayment(order: Order | null) {
  return order !== null && order.status === "PENDING" && new Date(order.expiresAt) > new Date();
}

function OrderPage() {
  const { orderId } = Route.useParams();
  const queryClient = useQueryClient();
  const { data: order } = useSuspenseQuery({
    ...orderQuery(orderId),
    refetchInterval: (query) =>
      awaitingPayment(query.state.data ?? null) ? PENDING_REFRESH_MS : false,
  });
  const status = order?.status;

  useEffect(() => {
    if (status === "PAID") {
      void queryClient.invalidateQueries({ queryKey: [...billingKey, "credits"] });
      void queryClient.invalidateQueries({ queryKey: [...billingKey, "orders"], exact: true });
    }
  }, [status, queryClient]);

  if (order === null) {
    return <OrderNotFound />;
  }
  const pending = awaitingPayment(order);

  return (
    <>
      <PageHeader
        title={order.items.map((item) => item.description).join(", ")}
        lead={`Orden ${order.reference}`}
      />

      {pending && (
        <Alert>
          <Spinner />
          <AlertTitle>Esperando la confirmación de Wompi</AlertTitle>
          <AlertDescription>
            Si ya pagaste, la orden se actualiza sola en unos segundos; con PSE puede tardar unos
            minutos. Si no terminaste el pago, puedes retomarlo antes de que la orden venza.
          </AlertDescription>
        </Alert>
      )}
      {order.status === "PAID" && (
        <Alert>
          <AlertTitle>Pago confirmado</AlertTitle>
          <AlertDescription>
            Tus créditos ya están disponibles. Te enviaremos la factura electrónica al correo de
            facturación.
          </AlertDescription>
        </Alert>
      )}
      {order.status === "FAILED" && (
        <Alert variant="destructive">
          <AlertTitle>El pago no se completó</AlertTitle>
          <AlertDescription>
            Wompi rechazó o anuló el pago. No se hizo ningún cobro por esta orden; puedes comprar de
            nuevo.
          </AlertDescription>
        </Alert>
      )}
      {order.status === "PENDING" && !pending && (
        <Alert>
          <AlertTitle>La orden venció sin pago</AlertTitle>
          <AlertDescription>Puedes comprar de nuevo cuando quieras.</AlertDescription>
        </Alert>
      )}

      <Section
        id="order-detail"
        title="Detalle"
        action={
          pending && order.checkout ? (
            <a href={order.checkout.link} className={cn(buttonVariants())}>
              Ir a pagar
            </a>
          ) : (
            <Link to="/billing" className={cn(buttonVariants({ variant: "outline" }))}>
              Ver el saldo
            </Link>
          )
        }
      >
        <dl className="grid gap-4 sm:grid-cols-4">
          <Entry label="Estado">
            <OrderStatusBadge status={order.status} />
          </Entry>
          <Entry label="Total">
            <span className="tabular-nums">{formatCents(order.totalCents)}</span>
          </Entry>
          <Entry label="Creada">{formatDateTime(new Date(order.createdAt))}</Entry>
          <Entry label={order.paidAt ? "Pagada" : "Vence"}>
            {formatDateTime(new Date(order.paidAt ?? order.expiresAt))}
          </Entry>
          <Entry label="Factura">
            {order.invoice ? (
              <OrderInvoiceDownloads orderId={order.id} invoice={order.invoice} />
            ) : (
              "Se emite cuando se confirma el pago"
            )}
          </Entry>
        </dl>
      </Section>
    </>
  );
}

function OrderNotFound() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ReceiptIcon />
        </EmptyMedia>
        <EmptyTitle>Orden no encontrada</EmptyTitle>
        <EmptyDescription>
          No existe o no pertenece a esta cuenta. Revisa el enlace o vuelve a tus órdenes.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Link to="/billing/orders" className={cn(buttonVariants({ variant: "outline" }))}>
          Volver a las órdenes
        </Link>
      </EmptyContent>
    </Empty>
  );
}
