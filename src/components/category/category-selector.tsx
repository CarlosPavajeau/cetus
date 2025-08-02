import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useCategories } from '@/hooks/categories'
import { cn } from '@/shared/cn'
import { CheckIcon, ChevronDownIcon, PlusIcon } from 'lucide-react'
import { useState } from 'react'
import { type FieldValues, useFormContext } from 'react-hook-form'

type FormWithCategory = FieldValues & {
  categoryId: string
}

type Props = {
  onSelectCreateCategory?: () => void
}

export function CategorySelector({ onSelectCreateCategory }: Props) {
  const { categories, isLoading } = useCategories()
  const form = useFormContext<FormWithCategory>()
  const [open, setOpen] = useState(false)

  return (
    <FormField
      control={form.control}
      name="categoryId"
      disabled={isLoading}
      render={({ field }) => (
        <FormItem>
          <FormLabel>Categoría</FormLabel>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <FormControl>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className={cn(
                    'w-full justify-between',
                    !field.value && 'text-muted-foreground',
                  )}
                  disabled={isLoading}
                >
                  {field.value
                    ? categories?.find(
                      (category) => category.id === field.value,
                    )?.name
                    : 'Selecciona una categoría'}
                  <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-full min-w-[var(--radix-popper-anchor-width)] border-input p-0">
              <Command>
                <CommandInput
                  placeholder="Buscar categoría..."
                  className="h-9"
                />
                <CommandList>
                  <CommandEmpty>No se encontraron categorías.</CommandEmpty>
                  <CommandGroup>
                    {categories?.map((category) => (
                      <CommandItem
                        value={category.name}
                        key={category.id}
                        onSelect={() => {
                          form.setValue('categoryId', category.id)
                          setOpen(false)
                        }}
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
                          if (onSelectCreateCategory) {
                            onSelectCreateCategory()
                            setOpen(false)
                          }
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
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
