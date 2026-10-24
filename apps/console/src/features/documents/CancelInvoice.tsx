import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { FileXIcon } from "lucide-react";
import { useId, useState } from "react";

import { Alert, AlertDescription } from "~/components/ui/alert";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import { Button } from "~/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "~/components/ui/field";
import { Spinner } from "~/components/ui/spinner";
import { Textarea } from "~/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip";
import { auditLogKey } from "~/features/audit-log/queries";
import type { DocumentDetail } from "~/lib/api/types";

import { formatMoney } from "./labels";
import { documentsKey } from "./queries";
import { cancelInvoice } from "./server";

/**
 * Cancels an accepted invoice with a credit note for all of it. Only offered while no credit note took
 * part of the invoice: then the full cancellation would exceed what is left to credit.
 */
export function CancelInvoice({ invoice }: { invoice: DocumentDetail }) {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  // One key per opening of the dialog: submitting twice issues a single note.
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const descriptionId = useId();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const cancel = useMutation({
    mutationFn: cancelInvoice,
    onSuccess: async (result) => {
      if (!result.ok) {
        return;
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: documentsKey }),
        queryClient.invalidateQueries({ queryKey: auditLogKey }),
      ]);
      setOpen(false);
      await navigate({ to: "/documents/$documentId", params: { documentId: result.id } });
    },
  });
  const pending = cancel.isPending;
  const failure = cancel.data && !cancel.data.ok ? cancel.data : null;
  const blocked = invoice.balance !== null && invoice.balance < invoice.totals.payable;

  if (blocked) {
    return (
      <Tooltip>
        <TooltipTrigger render={<span className="w-fit" />}>
          <Button variant="outline" disabled>
            <FileXIcon data-icon="inline-start" />
            Anular factura
          </Button>
        </TooltipTrigger>
        <TooltipContent className="max-w-64">
          Ya tiene notas crédito por parte de su valor: emite el resto con una nota crédito parcial.
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setIdempotencyKey(crypto.randomUUID());
          setDescription("");
          cancel.reset();
        }
      }}
    >
      <AlertDialogTrigger render={<Button variant="outline" />}>
        <FileXIcon data-icon="inline-start" />
        Anular factura
      </AlertDialogTrigger>
      <AlertDialogContent>
        <form
          className="contents"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            if (description.trim()) {
              cancel.mutate({ data: { id: invoice.id, idempotencyKey, description } });
            }
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>¿Anular la factura {invoice.number}?</AlertDialogTitle>
            <AlertDialogDescription>
              Una factura aceptada no se puede borrar. Emitiremos una nota crédito de anulación por
              su valor total, {formatMoney(invoice.totals.payable, invoice.currency)}, y la
              enviaremos a la DIAN. Se entregará al cliente por correo cuando la DIAN la acepte.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Field>
            <FieldLabel htmlFor={descriptionId}>Motivo</FieldLabel>
            <Textarea
              id={descriptionId}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={500}
              placeholder="Por ejemplo: error en el valor facturado"
              disabled={pending}
            />
            <FieldDescription>Queda en la nota como el motivo de la corrección.</FieldDescription>
          </Field>
          {failure && (
            <Alert variant="destructive">
              <AlertDescription>
                {failure.message}
                {failure.code === "no_active_numbering_range" && (
                  <>
                    {" "}
                    <Link
                      to="/issuers/$issuerId"
                      params={{ issuerId: invoice.issuer.id }}
                      className="underline underline-offset-4"
                    >
                      Ir al emisor
                    </Link>
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}
          {cancel.isError && (
            <Alert variant="destructive">
              <AlertDescription>
                No pudimos anular la factura. Inténtalo de nuevo en unos minutos.
              </AlertDescription>
            </Alert>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
            <Button type="submit" variant="destructive" disabled={pending || !description.trim()}>
              {pending && <Spinner data-icon="inline-start" />}
              Emitir nota de anulación
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
