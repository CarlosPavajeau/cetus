import { Button } from '@cetus/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@cetus/ui/command'
import { Field, FieldError, FieldGroup, FieldLabel } from '@cetus/ui/field'
import { Popover, PopoverContent, PopoverTrigger } from '@cetus/ui/popover'
import { useCategories } from '@cetus/web/features/categories/hooks/use-categories'
import { cn } from '@cetus/web/shared/cn'
import { CheckIcon, ChevronDownIcon, PlusIcon } from 'lucide-react'
import { useState } from 'react'
import { Controller, useFormContext } from 'react-hook-form'

type Props = {
  onSelectCreateCategory?: () => void
}

export function CategoryCombobox({ onSelectCreateCategory }: Readonly<Props>) {
  const { data, isLoading } = useCategories()
  const { control, setValue } = useFormContext()
  const [open, setOpen] = useState(false)

  return (
    <FieldGroup>
      <Controller
        control={control}
        name="categoryId"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel>Categoría</FieldLabel>
            <Popover onOpenChange={setOpen} open={open}>
              <PopoverTrigger asChild>
                <Button
                  aria-expanded={open}
                  className={cn(
                    'w-full justify-between',
                    !field.value && 'text-muted-foreground',
                  )}
                  disabled={isLoading}
                  variant="outline"
                >
                  {field.value
                    ? data?.find((category) => category.id === field.value)
                        ?.name
                    : 'Selecciona una categoría'}
                  <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full min-w-[var(--radix-popper-anchor-width)] border-input p-0">
                <Command>
                  <CommandInput
                    className="h-9"
                    placeholder="Buscar categoría..."
                  />
                  <CommandList>
                    <CommandEmpty>No se encontraron categorías.</CommandEmpty>
                    <CommandGroup>
                      {data?.map((category) => (
                        <CommandItem
                          key={category.id}
                          onSelect={() => {
                            setValue('categoryId', category.id, {
                              shouldValidate: true,
                              shouldDirty: true,
                            })
                            setOpen(false)
                          }}
                          value={category.name}
                        >
                          {category.name}
                          <CheckIcon
                            className={cn(
                              'ml-auto h-4 w-4',
                              category.id === field.value
                                ? 'opacity-100'
                                : 'opacity-0',
                            )}
                          />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                    <CommandSeparator />
                    {onSelectCreateCategory && (
                      <CommandGroup>
                        <CommandItem
                          onSelect={() => {
                            onSelectCreateCategory()
                            setOpen(false)
                          }}
                        >
                          <PlusIcon className="mr-2 h-4 w-4" />
                          <span>Agregar categoría</span>
                        </CommandItem>
                      </CommandGroup>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
    </FieldGroup>
  )
}
