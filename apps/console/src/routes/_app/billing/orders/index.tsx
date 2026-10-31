import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";

import { PageHeader } from "~/components/PageHeader";
import { buttonVariants } from "~/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "~/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { formatDateTime } from "~/features/api-keys/formats";
import { formatCents } from "~/features/billing/labels";
import { OrderInvoiceDownloads } from "~/features/billing/OrderInvoiceDownloads";
import { OrderStatusBadge } from "~/features/billing/OrderStatusBadge";
import { ordersQuery } from "~/features/billing/queries";
import { cn } from "~/lib/utils";

/** The account's purchases, with Cetus' invoice of each. */
export const Route = createFileRoute("/_app/billing/orders/")({
  loader: async ({ context: { queryClient } }) => {
    await queryClient.query({ ...ordersQuery, staleTime: "static" });
    return { crumb: "Órdenes y facturas" };
  },
  component: Orders,
});

function Orders() {
  const { data: orders } = useSuspenseQuery(ordersQuery);

  return (
    <>
      <PageHeader
        title="Órdenes y facturas"
        lead="Tus compras y la factura electrónica de cada una. La factura llega también al correo de facturación."
      />
      {orders.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Todavía no tienes compras</EmptyTitle>
            <EmptyDescription>Compra un paquete anual para emitir en producción.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Link to="/billing/products" className={cn(buttonVariants())}>
              Comprar créditos
            </Link>
          </EmptyContent>
        </Empty>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Factura</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell>
                  <Link
                    to="/billing/orders/$orderId"
                    params={{ orderId: order.id }}
                    className="underline-offset-4 hover:underline"
                  >
                    {formatDateTime(new Date(order.createdAt))}
                  </Link>
                </TableCell>
                <TableCell>{order.items.map((item) => item.description).join(", ")}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCents(order.totalCents)}
                </TableCell>
                <TableCell>
                  <OrderStatusBadge status={order.status} />
                </TableCell>
                <TableCell>
                  {order.invoice ? (
                    <OrderInvoiceDownloads orderId={order.id} invoice={order.invoice} />
                  ) : order.checkout ? (
                    <a
                      href={order.checkout.link}
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                    >
                      Pagar
                    </a>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </>
  );
}
