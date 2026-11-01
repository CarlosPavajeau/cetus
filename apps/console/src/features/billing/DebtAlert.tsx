import { Link } from "@tanstack/react-router";

import { Alert, AlertAction, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { buttonVariants } from "~/components/ui/button";

/** The account owes what it used and did not pay; purchases wait until it is paid. */
export function DebtAlert({ orderId }: { orderId: string }) {
  return (
    <Alert variant="destructive">
      <AlertTitle>Tienes un saldo pendiente</AlertTitle>
      <AlertDescription>
        Son documentos que tu cuenta ya usó y no se pagaron. Págalo para volver a comprar paquetes,
        recargas o suscripciones; mientras tanto puedes seguir emitiendo con lo que tengas
        disponible.
      </AlertDescription>
      <AlertAction>
        <Link
          to="/billing/orders/$orderId"
          params={{ orderId }}
          className={buttonVariants({ variant: "outline" })}
        >
          Pagar el saldo
        </Link>
      </AlertAction>
    </Alert>
  );
}
