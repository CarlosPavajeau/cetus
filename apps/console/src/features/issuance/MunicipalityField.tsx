import { useId } from "react";
import { type UseFormReturn, useController } from "react-hook-form";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "~/components/ui/combobox";
import { Field, FieldDescription, FieldError, FieldLabel } from "~/components/ui/field";
import { departments } from "~/features/setup/divipola";

import type { CustomerValues } from "./schema";

type Place = {
  code: string;
  name: string;
  departmentCode: string;
  departmentName: string;
  label: string;
};

const places: Place[] = departments
  .flatMap((department) =>
    department.municipalities.map((municipality) => ({
      code: municipality.code,
      name: municipality.name,
      departmentCode: department.code,
      departmentName: department.name,
      label: `${municipality.name}, ${department.name}`,
    })),
  )
  .toSorted((a, b) => a.name.localeCompare(b.name, "es"));

/**
 * The customer's municipality, searched by name across the country. Picking one fills in its DANE code and
 * its department, which the DIAN requires; the person never sees a code unless they look for it.
 */
export function MunicipalityField({ form }: { form: UseFormReturn<CustomerValues> }) {
  const id = useId();
  const { field, fieldState } = useController({
    control: form.control,
    name: "municipalityCode",
  });
  const selected = places.find((place) => place.code === field.value) ?? null;

  function select(place: Place | null) {
    field.onChange(place?.code ?? "");
    form.setValue("cityName", place?.name ?? "");
    form.setValue("departmentCode", place?.departmentCode ?? "");
    form.setValue("departmentName", place?.departmentName ?? "");
  }

  return (
    <Field data-invalid={fieldState.invalid} className="gap-1.75">
      <FieldLabel htmlFor={id} className="text-xs">
        Municipio (opcional)
      </FieldLabel>
      <Combobox
        items={places}
        value={selected}
        onValueChange={select}
        itemToStringLabel={(place: Place) => place.label}
        isItemEqualToValue={(a: Place, b: Place) => a.code === b.code}
      >
        <ComboboxInput
          id={id}
          placeholder="Busca por nombre"
          className="w-full"
          aria-invalid={fieldState.invalid}
          onBlur={field.onBlur}
          // Without it a picked municipality could not be removed, and the address would stay required.
          showClear={selected !== null}
          clearLabel="Quitar el municipio"
        />
        <ComboboxContent>
          <ComboboxEmpty>No hay municipios con ese nombre.</ComboboxEmpty>
          <ComboboxList>
            {(place: Place) => (
              <ComboboxItem key={place.code} value={place}>
                {place.label}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      {selected && !fieldState.invalid && (
        <FieldDescription className="text-[10px]">Código DANE: {selected.code}</FieldDescription>
      )}
      <FieldError errors={[fieldState.error]} className="text-[10px]" />
    </Field>
  );
}
