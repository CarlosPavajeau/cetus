import { arktypeResolver } from "@hookform/resolvers/arktype";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";

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
import { Spinner } from "~/components/ui/spinner";
import { toCustomerValues } from "~/features/catalog/schema";
import { CustomerFields } from "~/features/issuance/CustomerFields";
import {
  type CustomerExtras,
  type CustomerValues,
  emptyCustomer,
} from "~/features/issuance/schema";
import type { BillingProfile } from "~/lib/api/types";

import { billingKey } from "./queries";
import { billingProfileSchema } from "./schema";
import { saveBillingProfile } from "./server";

/** Sets who Cetus invoices for the account's purchases, or changes it; orders keep the profile they had. */
export function BillingProfileDialog({ profile }: { profile: BillingProfile | null }) {
  if (profile === null) {
    return <SaveProfile saved={null} values={emptyCustomer} />;
  }
  const saved = toCustomerValues(profile);
  return saved ? (
    <SaveProfile saved={saved} values={saved.values} />
  ) : (
    <p className="text-xs text-muted-foreground">
      Tiene datos que este formulario no muestra: cámbialo por API.
    </p>
  );
}

function SaveProfile({
  saved,
  values,
}: {
  saved: { extras: CustomerExtras } | null;
  values: CustomerValues;
}) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const form = useForm<CustomerValues>({
    resolver: arktypeResolver(billingProfileSchema),
    defaultValues: values,
  });
  const save = useMutation({
    mutationFn: (next: CustomerValues) =>
      saveBillingProfile({ data: { profile: next, extras: saved?.extras ?? {} } }),
    onSuccess: async (result) => {
      if (!result.ok) {
        return;
      }
      await queryClient.invalidateQueries({ queryKey: billingKey });
      setOpen(false);
    },
  });
  const failure =
    save.data && !save.data.ok
      ? save.data.message
      : save.error
        ? "No pudimos comunicarnos con Cetus. Revisa tu conexión e inténtalo de nuevo."
        : null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && save.isPending) {
          return;
        }
        setOpen(next);
        if (next) {
          form.reset(values);
          save.reset();
        }
      }}
    >
      <DialogTrigger render={<Button variant={saved ? "outline" : "default"} />}>
        {saved ? "Editar perfil" : "Completar perfil de facturación"}
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-3xl">
        <form
          className="contents"
          noValidate
          onSubmit={form.handleSubmit((next) => save.mutate(next))}
        >
          <DialogHeader>
            <DialogTitle>Perfil de facturación</DialogTitle>
            <DialogDescription>
              A quién le emitimos la factura electrónica de cada compra. Las órdenes ya creadas
              conservan los datos con que se crearon.
            </DialogDescription>
          </DialogHeader>
          <CustomerFields
            form={form}
            emailLabel="Correo de facturación"
            emailHint="Ahí enviamos la factura de cada compra."
          />
          {failure && (
            <Alert variant="destructive">
              <AlertDescription>{failure}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <DialogClose
              render={<Button variant="outline" type="button" />}
              disabled={save.isPending}
            >
              Cancelar
            </DialogClose>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending && <Spinner data-icon="inline-start" />}
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
