import { Link } from "@tanstack/react-router";

import { Alert, AlertAction, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { buttonVariants } from "~/components/ui/button";
import { dateFormat } from "~/features/api-keys/formats";
import { formatCount } from "~/features/usage/labels";
import type { AccountCourtesy } from "~/lib/api/types";

type Courtesy =
  | { status: "OFFERED"; documents: number; validityDays: number }
  | { status: "GRANTED"; documents: number; remaining: number; expiresAt: Date };

function parseCourtesy(view: AccountCourtesy): Courtesy {
  if (view.status === "OFFERED") {
    if (view.validityDays === null) {
      throw new Error("An offered courtesy needs the days it lasts");
    }
    return { status: "OFFERED", documents: view.documents, validityDays: view.validityDays };
  }
  if (view.remaining === null || view.expiresAt === null) {
    throw new Error("A granted courtesy needs its credits left and its expiry");
  }
  return {
    status: "GRANTED",
    documents: view.documents,
    remaining: view.remaining,
    expiresAt: new Date(view.expiresAt),
  };
}

/** The courtesy documents: the ones the first production issuer brings, or the ones the account got. */
export function CourtesyAlert({ courtesy: view }: { courtesy: AccountCourtesy }) {
  const courtesy = parseCourtesy(view);
  if (courtesy.status === "OFFERED") {
    return (
      <Alert>
        <AlertTitle>Tu primer emisor en producción trae documentos de cortesía</AlertTitle>
        <AlertDescription>
          {`Al pasar tu primer emisor a producción recibes ${formatCount(courtesy.documents)} documentos por ${formatCount(courtesy.validityDays)} días, mientras queden cupos y si tu empresa no los recibió antes. Después necesitarás una suscripción mensual o un paquete anual.`}
        </AlertDescription>
      </Alert>
    );
  }
  return (
    <Alert>
      <AlertTitle>Estás usando tus documentos de cortesía</AlertTitle>
      <AlertDescription>
        {`Te quedan ${formatCount(courtesy.remaining)} de ${formatCount(courtesy.documents)} hasta el ${dateFormat.format(courtesy.expiresAt)}. No tienen margen de gracia: cuando se acaben o venzan, solo podrás emitir notas crédito hasta que contrates una suscripción o compres un paquete.`}
      </AlertDescription>
      <AlertAction>
        <Link to="/billing/products" className={buttonVariants({ variant: "outline" })}>
          Ver productos
        </Link>
      </AlertAction>
    </Alert>
  );
}
