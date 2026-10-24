import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MailIcon } from "lucide-react";
import { useId, useState } from "react";

import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Spinner } from "~/components/ui/spinner";
import { auditLogKey } from "~/features/audit-log/queries";
import type { DocumentDetail } from "~/lib/api/types";

import { documentsKey } from "./queries";
import { resendDocument } from "./server";

/**
 * Emails an accepted document again, once its last delivery is over. A simulated document only ever goes
 * to the account's technical contact, so it takes no address.
 */
export function ResendDocument({ document }: { document: DocumentDetail }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const emailId = useId();
  const queryClient = useQueryClient();
  const resend = useMutation({
    mutationFn: resendDocument,
    onSuccess: async (result) => {
      if (!result.ok) {
        return;
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: documentsKey }),
        queryClient.invalidateQueries({ queryKey: auditLogKey }),
      ]);
      setOpen(false);
    },
  });
  const sandbox = document.environment === "SANDBOX";
  const failure =
    resend.data && !resend.data.ok
      ? resend.data.message
      : resend.error
        ? "No pudimos comunicarnos con Cetus. Revisa tu conexión e inténtalo de nuevo."
        : null;
  const busy = document.deliveries.some((delivery) => delivery.status === "PENDING");

  if (document.status !== "ACCEPTED" || document.deliveries.length === 0) {
    return null;
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setEmail("");
          resend.reset();
        }
      }}
    >
      <DialogTrigger render={<Button variant="outline" size="sm" disabled={busy} />}>
        <MailIcon data-icon="inline-start" />
        Reenviar correo
      </DialogTrigger>
      <DialogContent>
        <form
          className="contents"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            resend.mutate({ data: { id: document.id, email: sandbox ? "" : email } });
          }}
        >
          <DialogHeader>
            <DialogTitle>Reenviar {document.number}</DialogTitle>
            <DialogDescription>
              {sandbox
                ? "Los documentos de simulación nunca llegan al cliente: el correo va al contacto técnico de la cuenta."
                : "Enviamos otra vez el PDF y el AttachedDocument en un solo correo."}
            </DialogDescription>
          </DialogHeader>
          {!sandbox && (
            <Field>
              <FieldLabel htmlFor={emailId}>Enviar a</FieldLabel>
              <Input
                id={emailId}
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={document.customer.email ?? "correo@cliente.com"}
                disabled={resend.isPending}
              />
              <FieldDescription>
                {document.customer.email
                  ? `Déjalo vacío para enviarlo a ${document.customer.email}.`
                  : "El cliente no tiene correo registrado: escribe a dónde enviarlo."}
              </FieldDescription>
            </Field>
          )}
          {failure && (
            <Alert variant="destructive">
              <AlertDescription>{failure}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>Cancelar</DialogClose>
            <Button type="submit" disabled={resend.isPending}>
              {resend.isPending && <Spinner data-icon="inline-start" />}
              Reenviar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
