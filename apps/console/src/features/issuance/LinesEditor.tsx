import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { type } from "arktype";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { useEffect, useState } from "react";
import { Controller, type UseFormReturn, useFieldArray, useWatch } from "react-hook-form";

import { Button } from "~/components/ui/button";
import { FieldError } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Spinner } from "~/components/ui/spinner";
import { CatalogPicker } from "~/features/catalog/CatalogPicker";
import { toLineValues } from "~/features/catalog/schema";
import { formatMoney } from "~/features/documents/labels";
import type { Product } from "~/lib/api/types";

import { taxPresetIds, taxPresets } from "./catalogs";
import { type LineValues, type LinesFormValues, linesFormSchema } from "./schema";
import { previewDocument } from "./server";

const taxItems = taxPresetIds.map((value) => ({ value, label: taxPresets[value].label }));

export const emptyLine: LineValues = {
  description: "",
  quantity: "1",
  unitPrice: "",
  tax: "IVA_19",
};

const taxLabel: Record<string, string> = { IVA: "IVA", INC: "Impuesto al consumo", ICA: "ICA" };

/** The value once it has stopped changing for a moment, so typing does not call the API on every key. */
function useSettled<T>(value: T, delayMs: number) {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return settled;
}

/**
 * The lines of a document with their taxes, and the totals the API calculates for them: the console never
 * computes a tax, so what it shows is what the document will carry.
 */
export function LinesEditor({
  form,
  currency,
  products,
}: {
  form: UseFormReturn<LinesFormValues>;
  currency: string;
  /** The saved products with taxes the form offers. */
  products: Product[];
}) {
  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "lines",
  });
  const lines = useWatch({ control: form.control, name: "lines" });
  const settled = useSettled(lines, 400);
  const valid = linesFormSchema({ lines: settled });
  const preview = useQuery({
    queryKey: ["issuance", "preview", settled],
    queryFn: () => previewDocument({ data: { lines: settled } }),
    enabled: !(valid instanceof type.errors),
    placeholderData: keepPreviousData,
  });
  const totals = valid instanceof type.errors ? null : preview.data;

  return (
    <div className="flex flex-col gap-4">
      <div className="hidden grid-cols-[1fr_6rem_9rem_12rem_8rem_2.25rem] gap-3 text-2xs text-muted-foreground md:grid">
        <span>Descripción</span>
        <span>Cantidad</span>
        <span>Precio unitario</span>
        <span>Impuesto</span>
        <span className="text-right">Subtotal</span>
        <span />
      </div>
      <ol className="flex flex-col gap-4 md:gap-3">
        {fields.map((field, index) => {
          const errors = form.formState.errors.lines?.[index];
          const subtotal = totals?.lines[index]?.lineExtension;
          return (
            <li
              key={field.id}
              className="grid grid-cols-2 gap-3 md:grid-cols-[1fr_6rem_9rem_12rem_8rem_2.25rem] md:items-start"
            >
              <div className="col-span-2 md:col-span-1">
                <Input
                  {...form.register(`lines.${index}.description`)}
                  aria-label={`Descripción de la línea ${index + 1}`}
                  placeholder="Producto o servicio"
                  aria-invalid={Boolean(errors?.description)}
                />
                <FieldError errors={[errors?.description]} className="mt-1 text-[10px]" />
              </div>
              <div>
                <Input
                  {...form.register(`lines.${index}.quantity`)}
                  aria-label={`Cantidad de la línea ${index + 1}`}
                  inputMode="decimal"
                  aria-invalid={Boolean(errors?.quantity)}
                />
                <FieldError errors={[errors?.quantity]} className="mt-1 text-[10px]" />
              </div>
              <div>
                <Input
                  {...form.register(`lines.${index}.unitPrice`)}
                  aria-label={`Precio unitario de la línea ${index + 1}`}
                  inputMode="decimal"
                  placeholder="0"
                  aria-invalid={Boolean(errors?.unitPrice)}
                />
                <FieldError errors={[errors?.unitPrice]} className="mt-1 text-[10px]" />
              </div>
              <Controller
                control={form.control}
                name={`lines.${index}.tax`}
                render={({ field: tax }) => (
                  <Select
                    items={taxItems}
                    value={tax.value}
                    onValueChange={(value) => tax.onChange(value)}
                  >
                    <SelectTrigger
                      aria-label={`Impuesto de la línea ${index + 1}`}
                      className="col-span-2 w-full md:col-span-1"
                      onBlur={tax.onBlur}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {taxItems.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                )}
              />
              <p className="flex h-9 items-center text-xs tabular-nums md:justify-end">
                {subtotal === undefined ? "—" : formatMoney(subtotal, currency)}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="justify-self-end"
                onClick={() => remove(index)}
                disabled={fields.length === 1}
              >
                <Trash2Icon />
                <span className="sr-only">Quitar la línea {index + 1}</span>
              </Button>
            </li>
          );
        })}
      </ol>
      <FieldError errors={[form.formState.errors.lines?.root ?? form.formState.errors.lines]} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <Button type="button" variant="outline" size="sm" onClick={() => append(emptyLine)}>
          <PlusIcon data-icon="inline-start" />
          Agregar línea
        </Button>
        {products.length > 0 && (
          <div className="sm:w-80">
            <CatalogPicker
              label="Agregar un producto guardado"
              placeholder="Busca por código o descripción"
              empty="No hay productos con ese nombre."
              items={products}
              itemLabel={(product) => `${product.code} · ${product.description}`}
              onPick={(product) => {
                const line = toLineValues(product);
                if (!line) {
                  return;
                }
                // The blank line a form starts with gives way to the product.
                const blank = lines.findIndex((item) => !item.description && !item.unitPrice);
                if (blank === -1) {
                  append(line);
                } else {
                  update(blank, line);
                }
              }}
            />
          </div>
        )}
      </div>

      <dl
        aria-label="Totales"
        aria-busy={preview.isFetching}
        className="ml-auto grid w-full max-w-xs grid-cols-[1fr_auto] gap-x-6 gap-y-1.5 text-xs"
      >
        <dt className="text-muted-foreground">Subtotal</dt>
        <dd className="text-right tabular-nums">
          {totals ? formatMoney(totals.totals.lineExtension, currency) : "—"}
        </dd>
        {totals?.taxes.map((tax) => (
          <div key={`${tax.type}-${tax.percent}`} className="contents">
            <dt className="text-muted-foreground">
              {taxLabel[tax.type] ?? tax.type} {tax.percent} %
            </dt>
            <dd className="text-right tabular-nums">{formatMoney(tax.amount, currency)}</dd>
          </div>
        ))}
        <dt className="flex items-center gap-2 font-medium">
          Total
          {preview.isFetching && <Spinner className="size-3" />}
        </dt>
        <dd className="text-right font-medium tabular-nums">
          {totals ? formatMoney(totals.totals.payable, currency) : "—"}
        </dd>
      </dl>
    </div>
  );
}
