import { arktypeResolver } from "@hookform/resolvers/arktype";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

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
import { Field, FieldDescription, FieldError, FieldLabel } from "~/components/ui/field";
import { Spinner } from "~/components/ui/spinner";
import { Textarea } from "~/components/ui/textarea";

import { adminKey } from "./queries";
import { statusChangeSchema } from "./schema";
import { reactivateAccount, suspendAccount } from "./server";

const copy = {
  suspend: {
    trigger: "Suspender cuenta",
    title: "Suspender",
    lead: "Sus llaves de API dejan de funcionar y la consola queda en solo lectura. Los documentos ya en cola se terminan de procesar.",
    submit: "Suspender",
    pending: "Suspendiendo…",
  },
  reactivate: {
    trigger: "Reactivar cuenta",
    title: "Reactivar",
    lead: "Sus llaves de API vuelven a funcionar y la consola recupera todas sus acciones.",
    submit: "Reactivar",
    pending: "Reactivando…",
  },
} as const;

/** Suspends or reactivates an account with a mandatory reason, which the account's members see. */
export function AccountStatusDialog({
  accountId,
  accountName,
  action,
}: {
  accountId: string;
  accountName: string;
  action: "suspend" | "reactivate";
}) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const text = copy[action];
  const form = useForm({
    resolver: arktypeResolver(statusChangeSchema),
    defaultValues: { reason: "" },
  });
  const change = useMutation({
    mutationFn: action === "suspend" ? suspendAccount : reactivateAccount,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminKey });
      setOpen(false);
      form.reset();
    },
    onError: () => {
      form.setError("root", {
        message:
          "No pudimos cambiar el estado de la cuenta. Recarga la página: puede que ya haya cambiado.",
      });
    },
  });

  const onSubmit = form.handleSubmit(({ reason }) =>
    change.mutate({ data: { id: accountId, reason } }),
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant={action === "suspend" ? "destructive" : "default"} />}>
        {text.trigger}
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
          <DialogHeader>
            <DialogTitle>
              {text.title} {accountName}
            </DialogTitle>
            <DialogDescription>{text.lead}</DialogDescription>
          </DialogHeader>
          <Controller
            name="reason"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="account-status-reason">Motivo</FieldLabel>
                <Textarea
                  {...field}
                  id="account-status-reason"
                  rows={3}
                  maxLength={500}
                  aria-invalid={fieldState.invalid}
                />
                <FieldDescription>
                  Queda en el registro de auditoría y los miembros de la cuenta lo ven en su
                  consola.
                </FieldDescription>
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
          {form.formState.errors.root && (
            <Alert variant="destructive">
              <AlertDescription>{form.formState.errors.root.message}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />} disabled={change.isPending}>
              Cancelar
            </DialogClose>
            <Button
              type="submit"
              variant={action === "suspend" ? "destructive" : "default"}
              disabled={change.isPending}
            >
              {change.isPending && <Spinner data-icon="inline-start" />}
              {change.isPending ? text.pending : text.submit}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
