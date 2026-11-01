import { Link } from "@tanstack/react-router";

import { Alert, AlertAction, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { buttonVariants } from "~/components/ui/button";

/** The account owes what it used and did not pay; purchases wait until every debt is paid. */
export function DebtAlert({ orderId }: { orderId: string }) {
  return (
    <Alert variant="destructive">
      <AlertTitle>Tienes saldos pendientes</AlertTitle>
      <AlertDescription>
        Son documentos que tu cuenta ya usó y no se pagaron. Paga todos tus saldos pendientes para
        volver a comprar paquetes, recargas o suscripciones; mientras tanto puedes seguir emitiendo
        con lo que tengas disponible. Los encuentras en tus órdenes.
      </AlertDescription>
      <AlertAction>
        <Link
          to="/billing/orders/$orderId"
          params={{ orderId }}
          className={buttonVariants({ variant: "outline" })}
        >
          Pagar el más antiguo
        </Link>
      </AlertAction>
    </Alert>
  );
}
