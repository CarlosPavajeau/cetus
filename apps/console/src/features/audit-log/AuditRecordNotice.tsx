import { ShieldCheckIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";

/** Closes the activity pages: the log cannot be changed and never holds secrets. */
export function AuditRecordNotice() {
  return (
    <Alert size="lg">
      <ShieldCheckIcon className="size-5" />
      <AlertTitle>Un registro permanente, de solo lectura</AlertTitle>
      <AlertDescription>
        <p>
          Los eventos no se pueden editar ni eliminar. No se muestran claves, contraseñas ni otros
          secretos.
        </p>
      </AlertDescription>
    </Alert>
  );
}
