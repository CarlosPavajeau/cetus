import { arktypeResolver } from "@hookform/resolvers/arktype";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PlusIcon } from "lucide-react";
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
import { taxPresetIds, taxPresets } from "~/features/issuance/catalogs";
import { SelectField } from "~/features/issuance/fields";
import { TextField } from "~/features/setup/fields";
import type { Environment } from "~/lib/api/types";

import { catalogKey } from "./queries";
import { type ProductValues, productSchema } from "./schema";
import { createProduct } from "./server";

const taxItems = taxPresetIds.map((value) => ({ value, label: taxPresets[value].label }));

const empty: ProductValues = { code: "", description: "", unitPrice: "", tax: "IVA_19" };

export function CreateProduct({ environment }: { environment: Environment }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const form = useForm<ProductValues>({
    resolver: arktypeResolver(productSchema),
    defaultValues: empty,
  });
  const create = useMutation({
    mutationFn: createProduct,
    onSuccess: async (result) => {
      if (!result.ok) {
        return;
      }
      await queryClient.invalidateQueries({ queryKey: catalogKey });
      setOpen(false);
    },
  });
  const failure = create.data && !create.data.ok ? create.data : null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          form.reset(empty);
          create.reset();
        }
      }}
    >
      <DialogTrigger render={<Button />}>
        <PlusIcon data-icon="inline-start" />
        Nuevo producto
      </DialogTrigger>
      <DialogContent>
        <form
          className="contents"
          noValidate
          onSubmit={form.handleSubmit((product) =>
            create.mutate({ data: { environment, product } }),
          )}
        >
          <DialogHeader>
            <DialogTitle>Nuevo producto o servicio</DialogTitle>
            <DialogDescription>
              Lo agregas a una factura con un clic, con su precio y su impuesto.
            </DialogDescription>
          </DialogHeader>
          <TextField control={form.control} name="code" label="Código" autoComplete="off" />
          <TextField
            control={form.control}
            name="description"
            label="Descripción"
            autoComplete="off"
          />
          <TextField
            control={form.control}
            name="unitPrice"
            label="Precio unitario"
            inputMode="decimal"
            autoComplete="off"
          />
          <SelectField control={form.control} name="tax" label="Impuesto" items={taxItems} />
          {failure && (
            <Alert variant="destructive">
              <AlertDescription>{failure.message}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>Cancelar</DialogClose>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending && <Spinner data-icon="inline-start" />}
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
