import { arktypeResolver } from "@hookform/resolvers/arktype";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PencilIcon, PlusIcon } from "lucide-react";
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
import { CustomerFields } from "~/features/issuance/CustomerFields";
import {
  type CustomerExtras,
  type CustomerValues,
  customerFormSchema,
  emptyCustomer,
} from "~/features/issuance/schema";
import type { Customer, Environment } from "~/lib/api/types";

import { EditUnavailable } from "./EditUnavailable";
import { catalogKey } from "./queries";
import { toCustomerValues } from "./schema";
import { createCustomer, updateCustomer } from "./server";

type Saved = { customer: Customer; extras: CustomerExtras };

/** Creates a customer, or edits the one given when the form can show it whole. */
export function CustomerDialog({
  environment,
  customer,
}: {
  environment: Environment;
  customer?: Customer;
}) {
  if (!customer) {
    return <SaveCustomer environment={environment} saved={null} values={emptyCustomer} />;
  }
  const values = toCustomerValues(customer);
  return values ? (
    <SaveCustomer
      environment={environment}
      saved={{ customer, extras: values.extras }}
      values={values.values}
    />
  ) : (
    <EditUnavailable label={customer.legalName} />
  );
}

function SaveCustomer({
  environment,
  saved,
  values,
}: {
  environment: Environment;
  saved: Saved | null;
  values: CustomerValues;
}) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const form = useForm<CustomerValues>({
    resolver: arktypeResolver(customerFormSchema),
    defaultValues: values,
  });
  const save = useMutation({
    mutationFn: (next: CustomerValues) =>
      saved
        ? updateCustomer({
            data: { environment, id: saved.customer.id, customer: next, extras: saved.extras },
          })
        : createCustomer({ data: { environment, customer: next } }),
    onSuccess: async (result) => {
      if (!result.ok) {
        return;
      }
      await queryClient.invalidateQueries({ queryKey: catalogKey });
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
        setOpen(next);
        if (next) {
          form.reset(values);
          save.reset();
        }
      }}
    >
      {saved ? (
        <DialogTrigger render={<Button variant="ghost" size="icon-sm" />}>
          <PencilIcon />
          <span className="sr-only">Editar {saved.customer.legalName}</span>
        </DialogTrigger>
      ) : (
        <DialogTrigger render={<Button />}>
          <PlusIcon data-icon="inline-start" />
          Nuevo cliente
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-3xl">
        <form
          className="contents"
          noValidate
          onSubmit={form.handleSubmit((next) => save.mutate(next))}
        >
          <DialogHeader>
            <DialogTitle>{saved ? "Editar cliente" : "Nuevo cliente"}</DialogTitle>
            <DialogDescription>
              {saved
                ? "Las facturas ya emitidas conservan los datos con que se emitieron."
                : "Lo eliges al emitir una factura y sus datos se llenan solos."}
            </DialogDescription>
          </DialogHeader>
          <CustomerFields form={form} />
          {failure && (
            <Alert variant="destructive">
              <AlertDescription>{failure}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>Cancelar</DialogClose>
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
