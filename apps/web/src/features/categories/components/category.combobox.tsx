import type { Category } from '@cetus/api-client/types/categories'
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@cetus/ui/combobox'
import { Field, FieldError, FieldGroup, FieldLabel } from '@cetus/ui/field'
import { useCategories } from '@cetus/web/features/categories/hooks/use-categories'
import { Controller, useFormContext } from 'react-hook-form'

export function CategoryCombobox() {
  const { data, isLoading } = useCategories()
  const { control, setValue } = useFormContext()

  return (
    <FieldGroup>
      <Controller
        control={control}
        name="categoryId"
        render={({ field, fieldState }) => {
          const selectedCategory =
            data?.find((c) => c.id === field.value) ?? null

          return (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>Categoría</FieldLabel>
              <Combobox
                autoHighlight
                disabled={isLoading}
                items={data ?? []}
                itemToStringValue={(category: Category) => category.name}
                onValueChange={(category: Category | null) => {
                  setValue('categoryId', category?.id ?? '', {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }}
                value={selectedCategory}
              >
                <ComboboxInput placeholder="Buscar categoría..." />
                <ComboboxContent>
                  <ComboboxEmpty>No se encontraron categorías.</ComboboxEmpty>
                  <ComboboxList>
                    {(category: Category) => (
                      <ComboboxItem key={category.id} value={category}>
                        {category.name}
                      </ComboboxItem>
                    )}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )
        }}
      />
    </FieldGroup>
  )
}
