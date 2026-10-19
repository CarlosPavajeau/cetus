import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { RocketIcon } from "lucide-react";
import { useState } from "react";

import { Alert, AlertDescription } from "~/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/ui/spinner";
import { auditLogKey } from "~/features/audit-log/queries";
import type { IssuerDetail } from "~/lib/api/types";

import { promoteIssuer } from "./server";

/**
 * Starts the production issuer of a test issuer in habilitación and takes the person to the
 * assistant, where only the production numbering is usually left.
 */
export function PromoteIssuer({ issuer }: { issuer: IssuerDetail }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const promote = useMutation({
    mutationFn: promoteIssuer,
    onSuccess: async (live) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["issuers"] }),
        queryClient.invalidateQueries({ queryKey: auditLogKey }),
      ]);
      await navigate({ to: "/setup", search: { issuerId: live.id } });
    },
  });
  const pending = promote.isPending;

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        promote.reset();
      }}
    >
      <AlertDialogTrigger render={<Button />}>
        <RocketIcon data-icon="inline-start" />
        Pasar a producción
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Completaste la habilitación en la DIAN?</AlertDialogTitle>
          <AlertDialogDescription>
            Crearemos el emisor de producción de NIT {issuer.nit}-{issuer.checkDigit} con los mismos
            datos tributarios, el mismo software y una copia del certificado. Solo te faltará la
            resolución de numeración de producción. Este emisor de pruebas sigue funcionando.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {promote.error && (
          <Alert variant="destructive">
            <AlertDescription>{promote.error.message}</AlertDescription>
          </Alert>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => promote.mutate({ data: { id: issuer.id } })}
            disabled={pending}
          >
            {pending && <Spinner data-icon="inline-start" />}
            Crear emisor de producción
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
