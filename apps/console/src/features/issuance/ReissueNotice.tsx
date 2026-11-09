import { Link } from "@tanstack/react-router";
import { CopyIcon } from "lucide-react";

import { Alert, AlertAction, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { buttonVariants } from "~/components/ui/button";
import type { Environment } from "~/lib/api/types";
import { cn } from "~/lib/utils";

import type { ReissueGaps } from "./reissue";

const listFormat = new Intl.ListFormat("es", { type: "conjunction" });

function describeGaps(gaps: ReissueGaps) {
  return listFormat.format(
    [
      gaps.customer && "el cliente",
      gaps.payment && "el medio de pago",
      gaps.lineCount === 1 && "una línea",
      gaps.lineCount > 1 && `${gaps.lineCount} líneas`,
    ].filter((gap) => typeof gap === "string"),
  );
}

/** Says where a reissue form's data comes from, and what of it had to be left out. */
export function ReissueNotice({
  documentId,
  noun,
  number,
  status,
  environment,
  gaps,
}: {
  documentId: string;
  /** "factura", "nota crédito" or "nota débito". */
  noun: string;
  number: string;
  status: "REJECTED" | "FAILED";
  environment: Environment;
  gaps: ReissueGaps;
}) {
  const validator = environment === "SANDBOX" ? "el simulador" : "la DIAN";
  const missing = describeGaps(gaps);

  return (
    <Alert>
      <CopyIcon aria-hidden="true" />
      <AlertTitle>
        Datos copiados de la {noun} {number}
      </AlertTitle>
      <AlertDescription>
        <p>
          {status === "REJECTED"
            ? `Corrige lo que ${validator} rechazó antes de emitirla.`
            : "Revisa el certificado y el software del emisor antes de emitirla."}{" "}
          Saldrá con un número nuevo.
        </p>
        {gaps.issuer && <p>Su emisor ya no puede emitir en este ambiente: revisa cuál la emite.</p>}
        {missing && (
          <p>
            No se copiaron {missing}: usan datos que este formulario no ofrece. Complétalos a mano.
          </p>
        )}
      </AlertDescription>
      <AlertAction>
        <Link
          to="/documents/$documentId"
          params={{ documentId }}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          {status === "REJECTED" ? "Ver motivos del rechazo" : `Ver la ${noun} ${number}`}
        </Link>
      </AlertAction>
    </Alert>
  );
}
