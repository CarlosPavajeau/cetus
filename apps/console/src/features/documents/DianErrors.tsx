import { Link } from "@tanstack/react-router";
import { InfoIcon, TriangleAlertIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import type { DocumentDetail } from "~/lib/api/types";
import { cn } from "~/lib/utils";

import { type DianError, type DianRuleFix, dianRuleDocsUrl, parseDianError } from "./dian-errors";

const linkClassName = "w-fit underline underline-offset-4 hover:text-foreground";

const fixLabel: Record<DianRuleFix, string> = {
  ISSUER: "Ver los datos tributarios del emisor",
  NUMBERING: "Ver los rangos de numeración del emisor",
  CUSTOMER: "Buscar el cliente en el catálogo",
};

function FixLink({ fix, document }: { fix: DianRuleFix; document: DocumentDetail }) {
  return fix === "CUSTOMER" ? (
    <Link
      to="/catalog/customers"
      search={{ q: document.customer.identificationNumber }}
      className={linkClassName}
    >
      {fixLabel[fix]}
    </Link>
  ) : (
    <Link
      to="/issuers/$issuerId"
      params={{ issuerId: document.issuer.id }}
      hash={fix === "ISSUER" ? "tax-data" : "dian"}
      className={linkClassName}
    >
      {fixLabel[fix]}
    </Link>
  );
}

function DianErrorItem({
  error,
  document,
  source,
  validator,
  rejection,
}: {
  error: DianError;
  document: DocumentDetail;
  source: string;
  validator: string;
  rejection: boolean;
}) {
  // Gray secondary text falls under 4.5:1 on the rejection's red tint; there it takes the alert's own color.
  const secondaryClassName = rejection ? undefined : "text-muted-foreground";
  return (
    <li className="flex flex-col gap-1 text-pretty">
      <span className="font-medium">
        {error.explanation?.title ?? error.message}
        {error.rule && (
          <span className={cn("font-normal", secondaryClassName)}> · Regla {error.rule}</span>
        )}
      </span>
      {error.explanation ? (
        <>
          <span>{error.explanation.action}</span>
          <span className={secondaryClassName}>
            {source}: {error.message}
          </span>
        </>
      ) : (
        error.rule && (
          <span>
            Cetus todavía no explica esta regla. El mensaje de {validator} dice qué revisar; si no
            queda claro,{" "}
            <Link to="/help" className={linkClassName}>
              escríbenos desde Ayuda
            </Link>{" "}
            con el número del documento.
          </span>
        )
      )}
      {(error.explanation?.fix || error.rule) && (
        <span className="flex flex-wrap gap-x-4 gap-y-1">
          {error.explanation?.fix && <FixLink fix={error.explanation.fix} document={document} />}
          {error.rule && (
            <a
              href={dianRuleDocsUrl(error.rule)}
              target="_blank"
              rel="noreferrer"
              className={linkClassName}
            >
              Ver en la documentación ↗
            </a>
          )}
        </span>
      )}
    </li>
  );
}

/**
 * What the DIAN objected to, explained: rejections stop the document, notifications only point at data
 * worth fixing. A FAILED document shows why Cetus gave up instead.
 */
export function DianErrors({ document }: { document: DocumentDetail }) {
  const errors = document.dian.errors.map(parseDianError);
  // Without the "Regla: …, Rechazo/Notificación" prefix, a rejected document's messages are rejections.
  const rejections = errors.filter(
    (error) =>
      error.kind === "REJECTION" || (error.kind === null && document.status === "REJECTED"),
  );
  const notifications = errors.filter((error) => !rejections.includes(error));
  const sandbox = document.environment === "SANDBOX";
  const validator = sandbox ? "el simulador" : "la DIAN";
  const source = sandbox ? "Simulador" : "DIAN";

  return (
    <>
      {document.status === "FAILED" && (
        <Alert variant="warning">
          <TriangleAlertIcon aria-hidden="true" />
          <AlertTitle>
            <h2>No se pudo enviar {sandbox ? "al simulador" : "a la DIAN"}</h2>
          </AlertTitle>
          <AlertDescription>
            <p>
              {document.dian.statusMessage ??
                `Cetus agotó los reintentos sin obtener respuesta de ${validator}.`}
            </p>
            <p>
              Revisa el certificado y el software del emisor, y emítelo de nuevo: saldrá con otro
              número.{" "}
              {document.documentType === "INVOICE"
                ? `Si ${validator} acepta esta factura después, anula una de las dos con una nota crédito.`
                : `Si ${validator} acepta esta nota después, las dos quedan válidas.`}
            </p>
          </AlertDescription>
        </Alert>
      )}
      {(rejections.length > 0 || (document.status === "REJECTED" && errors.length === 0)) && (
        <Alert variant="destructive">
          <AlertTitle>
            <h2>Motivos del rechazo</h2>
          </AlertTitle>
          <AlertDescription>
            {rejections.length > 0 ? (
              <ul className="flex flex-col gap-3">
                {rejections.map((error) => (
                  <DianErrorItem
                    key={`${error.rule}-${error.message}`}
                    error={error}
                    document={document}
                    source={source}
                    validator={validator}
                    rejection
                  />
                ))}
              </ul>
            ) : (
              <p>
                {document.dian.statusMessage ??
                  `${sandbox ? "El simulador" : "La DIAN"} no indicó el motivo.`}
              </p>
            )}
          </AlertDescription>
        </Alert>
      )}
      {notifications.length > 0 && (
        <Alert>
          <InfoIcon aria-hidden="true" />
          <AlertTitle>
            <h2>Notificaciones {sandbox ? "del simulador" : "de la DIAN"}</h2>
          </AlertTitle>
          <AlertDescription>
            <p>No impiden la validez del documento, pero conviene corregir estos datos.</p>
            <ul className="flex flex-col gap-3">
              {notifications.map((error) => (
                <DianErrorItem
                  key={`${error.rule}-${error.message}`}
                  error={error}
                  document={document}
                  source={source}
                  validator={validator}
                  rejection={false}
                />
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </>
  );
}
