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
import { taxPresetIds, taxPresets } from "~/features/issuance/catalogs";
import { SelectField } from "~/features/issuance/fields";
import { TextField } from "~/features/setup/fields";
import type { Environment, Product } from "~/lib/api/types";

import { EditUnavailable } from "./EditUnavailable";
import { catalogKey } from "./queries";
import { type ProductValues, productSchema, toProductValues } from "./schema";
import { createProduct, updateProduct } from "./server";

const taxItems = taxPresetIds.map((value) => ({ value, label: taxPresets[value].label }));

const empty: ProductValues = { code: "", description: "", unitPrice: "", tax: "IVA_19" };

/** Creates a product, or edits the one given when the form can show it whole. */
export function ProductDialog({
  environment,
  product,
}: {
  environment: Environment;
  product?: Product;
}) {
  if (!product) {
    return <SaveProduct environment={environment} product={undefined} values={empty} />;
  }
  const values = toProductValues(product);
  return values ? (
    <SaveProduct environment={environment} product={product} values={values} />
  ) : (
    <EditUnavailable label={product.description} />
  );
}

function SaveProduct({
  environment,
  product,
  values,
}: {
  environment: Environment;
  product: Product | undefined;
  values: ProductValues;
}) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const form = useForm<ProductValues>({
    resolver: arktypeResolver(productSchema),
    defaultValues: values,
  });
  const save = useMutation({
    mutationFn: (next: ProductValues) =>
      product
        ? updateProduct({
            data: { environment, id: product.id, unitCode: product.unitCode, product: next },
          })
        : createProduct({ data: { environment, product: next } }),
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
      {product ? (
        <DialogTrigger render={<Button variant="ghost" size="icon-sm" />}>
          <PencilIcon />
          <span className="sr-only">Editar {product.description}</span>
        </DialogTrigger>
      ) : (
        <DialogTrigger render={<Button />}>
          <PlusIcon data-icon="inline-start" />
          Nuevo producto
        </DialogTrigger>
      )}
      <DialogContent>
        <form
          className="contents"
          noValidate
          onSubmit={form.handleSubmit((next) => save.mutate(next))}
        >
          <DialogHeader>
            <DialogTitle>{product ? "Editar producto" : "Nuevo producto o servicio"}</DialogTitle>
            <DialogDescription>
              {product
                ? "Las facturas ya emitidas conservan los datos con que se emitieron."
                : "Lo agregas a una factura con un clic, con su precio y su impuesto."}
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
