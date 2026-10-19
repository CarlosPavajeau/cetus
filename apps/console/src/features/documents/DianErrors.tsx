import { CircleAlertIcon, InfoIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import type { DocumentDetail } from "~/lib/api/types";

import { type DianError, parseDianError } from "./dian-errors";

function DianErrorItem({ error }: { error: DianError }) {
  return (
    <li className="flex flex-col gap-1">
      <span className="font-medium">
        {error.explanation?.title ?? error.message}
        {error.rule && (
          <span className="ml-1.5 font-normal text-muted-foreground">Regla {error.rule}</span>
        )}
      </span>
      {error.explanation && (
        <>
          <span>{error.explanation.action}</span>
          <span className="text-muted-foreground">DIAN: {error.message}</span>
        </>
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

  return (
    <>
      {document.status === "FAILED" && (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>No se pudo enviar a la DIAN</AlertTitle>
          <AlertDescription>
            <p>
              {document.dian.statusMessage ??
                "Cetus agotó los reintentos sin obtener respuesta de la DIAN."}
            </p>
            <p>
              Revisa la configuración del emisor (certificado y software) y vuelve a emitirlo con
              una nueva llave de idempotencia.
            </p>
          </AlertDescription>
        </Alert>
      )}
      {(rejections.length > 0 || (document.status === "REJECTED" && errors.length === 0)) && (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>Motivos del rechazo</AlertTitle>
          <AlertDescription>
            {rejections.length > 0 ? (
              <ul className="flex flex-col gap-3">
                {rejections.map((error) => (
                  <DianErrorItem key={`${error.rule}-${error.message}`} error={error} />
                ))}
              </ul>
            ) : (
              <p>{document.dian.statusMessage ?? "La DIAN no indicó el motivo."}</p>
            )}
          </AlertDescription>
        </Alert>
      )}
      {notifications.length > 0 && (
        <Alert>
          <InfoIcon />
          <AlertTitle>Notificaciones de la DIAN</AlertTitle>
          <AlertDescription>
            <p>No impiden la validez del documento, pero conviene corregir estos datos.</p>
            <ul className="flex flex-col gap-3">
              {notifications.map((error) => (
                <DianErrorItem key={`${error.rule}-${error.message}`} error={error} />
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </>
  );
}
