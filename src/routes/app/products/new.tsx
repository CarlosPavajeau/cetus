import { AccessDenied } from '@/components/access-denied'
import { CreateCategoryDialog } from '@/components/category/create-category.dialog'
import {
  ImageUploader,
  useImageUpload,
} from '@/components/product/image-uploader'
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent } from '@/components/ui/popover'
import { Textarea } from '@/components/ui/textarea'
import { useCategories } from '@/hooks/categories'
import { useCreateProduct } from '@/hooks/products'
import {
  type CreateProductFormValues,
  createProductSchema,
} from '@/schemas/product'
import { cn } from '@/shared/cn'
import { Protect } from '@clerk/clerk-react'
import { zodResolver } from '@hookform/resolvers/zod'
import { PopoverTrigger } from '@radix-ui/react-popover'
import { createFileRoute } from '@tanstack/react-router'
import { CheckIcon, ChevronDownIcon, PlusIcon } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useForm } from 'react-hook-form'

export const Route = createFileRoute('/app/products/new')({
  component: ProductCreateForm,
})

type CategorySelectorProps = {
  form: ReturnType<typeof useForm<CreateProductFormValues>>
  categories: Array<{ id: string; name: string }> | undefined
  openCategoryDialog: () => void
}

function CategorySelector({
  form,
  categories,
  openCategoryDialog,
}: CategorySelectorProps) {
  const [open, setOpen] = useState(false)

  return (
    <FormField
      control={form.control}
      name="categoryId"
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
                  <CommandGroup>
                    <CommandItem
                      onSelect={() => {
                        openCategoryDialog()
                        setOpen(false)
                      }}
                    >
                      <PlusIcon className="mr-2 h-4 w-4" />
                      <span>Agregar categoría</span>
                    </CommandItem>
                  </CommandGroup>
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

function ProductCreateForm() {
  const { categories } = useCategories()
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false)

  const form = useForm<CreateProductFormValues>({
    resolver: zodResolver(createProductSchema),
    defaultValues: {
      name: '',
      description: '',
      price: 0,
      stock: 0,
      imageUrl: '',
      categoryId: '',
    },
  })

  const {
    mainImage,
    mainImageUrl,
    getRootProps,
    getInputProps,
    isDragActive,
    removeImage,
  } = useImageUpload(form)

  const createProductMutation = useCreateProduct(mainImage)

  const openCategoryDialog = useCallback(() => {
    setIsCategoryDialogOpen(true)
  }, [])

  return (
    <Protect permission="org:app:access" fallback={<AccessDenied />}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-bold font-heading text-2xl text-foreground">
            Crear producto
          </h1>
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((values) =>
              createProductMutation.mutate(values),
            )}
            className="space-y-8"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre</FormLabel>
                      <FormControl>
                        <Input placeholder="Nombre del producto" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descripción</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Descripción del producto"
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Precio</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type="number"
                              className="peer ps-6 pe-12"
                              {...field}
                            />
                            <span className="pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 text-muted-foreground text-sm peer-disabled:opacity-50">
                              $
                            </span>
                            <span className="pointer-events-none absolute inset-y-0 end-0 flex items-center justify-center pe-3 text-muted-foreground text-sm peer-disabled:opacity-50">
                              COP
                            </span>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="stock"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Stock</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            className="tabular-nums"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <CategorySelector
                  form={form}
                  categories={categories}
                  openCategoryDialog={openCategoryDialog}
                />
              </div>

              <div>
                <FormField
                  control={form.control}
                  name="imageUrl"
                  render={() => (
                    <FormItem>
                      <ImageUploader
                        form={form}
                        mainImage={mainImage}
                        mainImageUrl={mainImageUrl}
                        getRootProps={getRootProps}
                        getInputProps={getInputProps}
                        isDragActive={isDragActive}
                        removeImage={removeImage}
                      />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={createProductMutation.isPending}
                className="w-full md:w-auto"
              >
                {createProductMutation.isPending
                  ? 'Creando...'
                  : 'Crear producto'}
              </Button>
            </div>
          </form>
        </Form>

        <CreateCategoryDialog
          open={isCategoryDialogOpen}
          onOpenChange={setIsCategoryDialogOpen}
        />
      </div>
    </Protect>
  )
}
