import { useId } from "react";
import { type UseFormReturn, useController, useWatch } from "react-hook-form";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "~/components/ui/combobox";
import { Field, FieldDescription, FieldError, FieldLabel } from "~/components/ui/field";

import { type Department, type Municipality, departments } from "./divipola";
import type { IssuerValues } from "./schema";

const byCode = (a: { code: string }, b: { code: string }) => a.code === b.code;

/**
 * Department and municipality of the issuer, always in Colombia. Picking a place from the DIVIPOLA catalog
 * fills in both its name and its DANE code, which the DIAN requires.
 */
export function LocationFields({ form }: { form: UseFormReturn<IssuerValues> }) {
  const departmentId = useId();
  const municipalityId = useId();
  const department = useController({ control: form.control, name: "departmentCode" });
  const municipality = useController({ control: form.control, name: "municipalityCode" });
  const departmentCode = useWatch({ control: form.control, name: "departmentCode" });
  const selectedDepartment = departments.find((item) => item.code === departmentCode) ?? null;
  const selectedMunicipality =
    selectedDepartment?.municipalities.find((item) => item.code === municipality.field.value) ??
    null;

  function selectDepartment(item: Department | null) {
    department.field.onChange(item?.code ?? "");
    form.setValue("departmentName", item?.name ?? "");
    // The municipality belongs to the previous department.
    form.setValue("municipalityCode", "");
    form.setValue("cityName", "");
  }

  function selectMunicipality(item: Municipality | null) {
    municipality.field.onChange(item?.code ?? "");
    form.setValue("cityName", item?.name ?? "");
  }

  return (
    <>
      <Field data-invalid={department.fieldState.invalid} size="sm">
        <FieldLabel htmlFor={departmentId}>Departamento</FieldLabel>
        <Combobox
          items={departments}
          value={selectedDepartment}
          onValueChange={selectDepartment}
          itemToStringLabel={(item: Department) => item.name}
          isItemEqualToValue={byCode}
        >
          <ComboboxInput
            id={departmentId}
            placeholder="Busca el departamento"
            className="w-full"
            aria-invalid={department.fieldState.invalid}
            onBlur={department.field.onBlur}
          />
          <ComboboxContent>
            <ComboboxEmpty>No hay departamentos con ese nombre.</ComboboxEmpty>
            <ComboboxList>
              {(item: Department) => (
                <ComboboxItem key={item.code} value={item}>
                  {item.name}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
        {selectedDepartment && (
          <FieldDescription>Código DANE: {selectedDepartment.code}</FieldDescription>
        )}
        <FieldError errors={[department.fieldState.error]} />
      </Field>

      <Field data-invalid={municipality.fieldState.invalid} size="sm">
        <FieldLabel htmlFor={municipalityId}>Municipio</FieldLabel>
        <Combobox
          // Remount when the department changes so the search text starts empty.
          key={selectedDepartment?.code ?? "none"}
          items={selectedDepartment?.municipalities ?? []}
          value={selectedMunicipality}
          onValueChange={selectMunicipality}
          itemToStringLabel={(item: Municipality) => item.name}
          isItemEqualToValue={byCode}
          disabled={!selectedDepartment}
        >
          <ComboboxInput
            id={municipalityId}
            placeholder={
              selectedDepartment ? "Busca el municipio" : "Elige primero el departamento"
            }
            className="w-full"
            disabled={!selectedDepartment}
            aria-invalid={municipality.fieldState.invalid}
            onBlur={municipality.field.onBlur}
          />
          <ComboboxContent>
            <ComboboxEmpty>No hay municipios con ese nombre.</ComboboxEmpty>
            <ComboboxList>
              {(item: Municipality) => (
                <ComboboxItem key={item.code} value={item}>
                  {item.name}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
        {selectedMunicipality && (
          <FieldDescription>Código DANE: {selectedMunicipality.code}</FieldDescription>
        )}
        <FieldError errors={[municipality.fieldState.error]} />
      </Field>
    </>
  );
}
