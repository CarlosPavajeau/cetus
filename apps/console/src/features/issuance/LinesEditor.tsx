import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { type } from "arktype";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { useId } from "react";
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
import { productUnavailable, toLineValues } from "~/features/catalog/schema";
import { useProductSearch } from "~/features/catalog/useCatalogSearch";
import { formatMoney } from "~/features/documents/labels";
import { errorIdOf } from "~/features/setup/fields";
import type { DocumentPreview, Environment, Product } from "~/lib/api/types";
import { useSettled } from "~/lib/useSettled";
import { cn } from "~/lib/utils";

import { taxPresetIds, taxPresets } from "./catalogs";
import { type LineValues, type LinesFormValues, decimal, linesFormSchema } from "./schema";
import { previewDocument } from "./server";

const taxItems = taxPresetIds.map((value) => ({ value, label: taxPresets[value].label }));

export const emptyLine: LineValues = {
  description: "",
  quantity: "1",
  unitPrice: "",
  tax: "IVA_19",
  unitCode: "94",
};

const taxLabel: Record<string, string> = { IVA: "IVA", INC: "Impuesto al consumo", ICA: "ICA" };

export type LinesPreview = { totals: DocumentPreview | null; isFetching: boolean };

/**
 * The totals the API calculates for the lines: the console never computes a tax, so what it shows is what
 * the document will carry.
 */
export function useLinesPreview(form: UseFormReturn<LinesFormValues>): LinesPreview {
  const lines = useWatch({ control: form.control, name: "lines" });
  const settled = useSettled(lines, 400);
  const valid = linesFormSchema({ lines: settled });
  const preview = useQuery({
    queryKey: ["issuance", "preview", settled],
    queryFn: () => previewDocument({ data: { lines: settled } }),
    enabled: !(valid instanceof type.errors),
    placeholderData: keepPreviousData,
  });
  return {
    totals: valid instanceof type.errors ? null : (preview.data ?? null),
    isFetching: preview.isFetching,
  };
}

/** The lines of a document with their taxes, and the subtotal of each one from the preview. */
export function LinesEditor({
  form,
  preview,
  currency,
  environment,
}: {
  form: UseFormReturn<LinesFormValues>;
  preview: LinesPreview;
  currency: string;
  /** Where the saved products come from. */
  environment: Environment;
}) {
  const productSearch = useProductSearch(environment);
  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "lines",
  });
  const lines = useWatch({ control: form.control, name: "lines" });
  const baseId = useId();

  function pickProduct(product: Product) {
    const line = toLineValues(product);
    if (!line) {
      return;
    }
    const same = lines.findIndex(
      (item) =>
        item.description === line.description &&
        item.unitPrice === line.unitPrice &&
        item.tax === line.tax &&
        item.unitCode === line.unitCode,
    );
    // The blank line a form starts with gives way to the product.
    const blank = lines.findIndex((item) => !item.description && !item.unitPrice);
    const index = same !== -1 ? same : blank !== -1 ? blank : fields.length;
    if (same !== -1) {
      const quantity = lines[same]?.quantity ?? "";
      // A quantity being corrected is left for the person to finish.
      if (decimal.test(quantity)) {
        form.setValue(`lines.${same}.quantity`, String(Number((Number(quantity) + 1).toFixed(6))), {
          shouldDirty: true,
          shouldValidate: form.formState.isSubmitted,
        });
      }
    } else if (blank !== -1) {
      update(blank, line);
    } else {
      append(line, { shouldFocus: false });
    }
    // After the picker closes, which returns the focus to its box.
    setTimeout(() => form.setFocus(`lines.${index}.quantity`, { shouldSelect: true }));
  }

  return (
    <div className="@container flex flex-col gap-4">
      {productSearch.saved && (
        <div className="sm:max-w-sm">
          <CatalogPicker
            label="Agregar un producto guardado"
            placeholder="Busca por código o descripción"
            empty="No hay productos con ese código o descripción."
            items={productSearch.items}
            itemLabel={(product) => `${product.code} · ${product.description}`}
            unavailable={productUnavailable}
            onSearch={productSearch.setText}
            onPick={pickProduct}
          />
        </div>
      )}
      {/* The labels of each line name the fields; this row only shows them once, as a table. */}
      <div
        aria-hidden
        className="hidden grid-cols-[minmax(0,1fr)_5rem_8rem_12rem_7rem_2.25rem] gap-3 text-2xs text-muted-foreground @4xl:grid"
      >
        <span>Descripción</span>
        <span>Cantidad</span>
        <span>Precio unitario</span>
        <span>Impuesto</span>
        <span className="text-right">Subtotal</span>
        <span />
      </div>
      <ol className="flex flex-col gap-4 @4xl:gap-3">
        {fields.map((field, index) => {
          const errors = form.formState.errors.lines?.[index];
          const subtotal = preview.totals?.lines[index]?.lineExtension;
          const lineId = `${baseId}-${field.id}`;
          return (
            <li
              key={field.id}
              className="grid grid-cols-2 gap-3 @xl:grid-cols-[5rem_minmax(0,1fr)_minmax(0,1fr)_7rem_2.25rem] @xl:items-start @4xl:grid-cols-[minmax(0,1fr)_5rem_8rem_12rem_7rem_2.25rem]"
            >
              <div className="col-span-2 flex flex-col gap-1 @xl:col-span-5 @4xl:col-span-1">
                <LineLabel htmlFor={`${lineId}-description`} text="Descripción" index={index} />
                <Input
                  {...form.register(`lines.${index}.description`)}
                  id={`${lineId}-description`}
                  placeholder="Producto o servicio"
                  aria-invalid={Boolean(errors?.description)}
                  aria-describedby={
                    errors?.description ? errorIdOf(`${lineId}-description`) : undefined
                  }
                />
                <FieldError
                  id={errorIdOf(`${lineId}-description`)}
                  errors={[errors?.description]}
                  size="xs"
                />
              </div>
              <div className="flex flex-col gap-1">
                <LineLabel htmlFor={`${lineId}-quantity`} text="Cantidad" index={index} />
                <Input
                  {...form.register(`lines.${index}.quantity`)}
                  id={`${lineId}-quantity`}
                  inputMode="decimal"
                  aria-invalid={Boolean(errors?.quantity)}
                  aria-describedby={errors?.quantity ? errorIdOf(`${lineId}-quantity`) : undefined}
                />
                <FieldError
                  id={errorIdOf(`${lineId}-quantity`)}
                  errors={[errors?.quantity]}
                  size="xs"
                />
              </div>
              <div className="flex flex-col gap-1">
                <LineLabel htmlFor={`${lineId}-unit-price`} text="Precio unitario" index={index} />
                <Input
                  {...form.register(`lines.${index}.unitPrice`)}
                  id={`${lineId}-unit-price`}
                  inputMode="decimal"
                  placeholder="0"
                  aria-invalid={Boolean(errors?.unitPrice)}
                  aria-describedby={
                    errors?.unitPrice ? errorIdOf(`${lineId}-unit-price`) : undefined
                  }
                />
                <FieldError
                  id={errorIdOf(`${lineId}-unit-price`)}
                  errors={[errors?.unitPrice]}
                  size="xs"
                />
              </div>
              <div className="col-span-2 flex flex-col gap-1 @xl:col-span-1">
                <LineLabel htmlFor={`${lineId}-tax`} text="Impuesto" index={index} />
                <Controller
                  control={form.control}
                  name={`lines.${index}.tax`}
                  render={({ field: tax }) => (
                    <Select
                      items={taxItems}
                      value={tax.value}
                      onValueChange={(value) => tax.onChange(value)}
                    >
                      <SelectTrigger id={`${lineId}-tax`} className="w-full" onBlur={tax.onBlur}>
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
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-2xs leading-4 text-muted-foreground @xl:text-right @4xl:hidden">
                  Subtotal
                </span>
                <p className="flex h-9 items-center text-xs tabular-nums @xl:justify-end">
                  {subtotal === undefined ? "—" : formatMoney(subtotal, currency)}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="mt-5 justify-self-end @4xl:mt-0"
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
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start"
        onClick={() => append(emptyLine)}
      >
        <PlusIcon data-icon="inline-start" />
        Agregar línea
      </Button>
    </div>
  );
}

/** A field's label: shown on its own line, and only to screen readers once the table header names it. */
function LineLabel({ htmlFor, text, index }: { htmlFor: string; text: string; index: number }) {
  return (
    <label htmlFor={htmlFor} className="text-2xs leading-4 text-muted-foreground @4xl:sr-only">
      {text}
      <span className="sr-only"> de la línea {index + 1}</span>
    </label>
  );
}

/** The totals of the preview, with each tax apart. */
export function LinesTotals({
  preview: { totals, isFetching },
  currency,
  className,
}: {
  preview: LinesPreview;
  currency: string;
  className?: string;
}) {
  return (
    <dl
      aria-label="Totales"
      aria-busy={isFetching}
      className={cn("grid grid-cols-[1fr_auto] gap-x-6 gap-y-1.5 text-xs", className)}
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
        {isFetching && <Spinner className="size-3" />}
      </dt>
      <dd className="text-right font-medium tabular-nums">
        {totals ? formatMoney(totals.totals.payable, currency) : "—"}
      </dd>
    </dl>
  );
}
