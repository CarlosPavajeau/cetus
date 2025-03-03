import { uploadFileToS3 } from '@/api/aws'
import { createProduct } from '@/api/products'
import { AccessDenied } from '@/components/access-denied'
import { CreateCategoryDialog } from '@/components/create-category.dialog'
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
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent } from '@/components/ui/popover'
import { Textarea } from '@/components/ui/textarea'
import { useCategories } from '@/hooks/use-categories'
import { cn } from '@/shared/cn'
import { Protect } from '@clerk/clerk-react'
import { zodResolver } from '@hookform/resolvers/zod'
import { PopoverTrigger } from '@radix-ui/react-popover'
import { useMutation } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  CheckIcon,
  ChevronDownIcon,
  PlusIcon,
  UploadIcon,
  XIcon,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { useForm } from 'react-hook-form'
import { v4 as uuid } from 'uuid'
import { type TypeOf, z } from 'zod'

export const Route = createFileRoute('/app/products/new')({
  component: RouteComponent,
})

export const createProductSchema = z.object({
  name: z.string(),
  description: z
    .string()
    .optional()
    .transform((value) => {
      if (value?.length === 0) return undefined

      return value
    }),
  price: z.coerce.number(),
  stock: z.coerce.number(),
  imageUrl: z.string(),
  categoryId: z.string(),
})

export type FormValues = TypeOf<typeof createProductSchema>

function RouteComponent() {
  const { categories } = useCategories()

  const form = useForm<FormValues>({
    resolver: zodResolver(createProductSchema),
  })

  const [mainImage, setMainImage] = useState<File | null>(null)
  const mainImageUrl = useMemo(() => {
    if (!mainImage) return

    return URL.createObjectURL(mainImage)
  }, [mainImage])

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0]
        const fileName = uuid()

        setMainImage(file)
        form.setValue('imageUrl', fileName)
      }
    },
    [form],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    maxSize: 1024 * 1024 * 5, // 5 MB
    accept: {
      'image/png': ['.png'],
      'image/jpeg': ['.jpeg'],
    },
  })

  const removeMainImage = () => {
    setMainImage(null)
  }

  const createProductMutation = useMutation({
    mutationKey: ['products', 'create'],
    mutationFn: createProduct,
  })

  const uploadProductImageMutation = useMutation({
    mutationKey: ['products', 'upload-image'],
    mutationFn: uploadFileToS3,
  })

  const onSubmit = form.handleSubmit((values) => {
    createProductMutation.mutate(values)

    if (mainImage) {
      const fileName = values.imageUrl
      uploadProductImageMutation.mutate({
        fileName,
        file: mainImage,
      })
    }
  })

  const navigate = useNavigate()
  useEffect(() => {
    if (createProductMutation.isSuccess) {
      form.reset({
        name: '',
        description: undefined,
        price: 0,
        stock: 0,
        categoryId: '',
      })

      navigate({
        to: '/app/products',
        replace: true,
      })
    }
  }, [form, createProductMutation.isSuccess, navigate])

  const [openCategorySelect, setOpenCategorySelect] = useState(false)
  const [openCreateCategoryDialog, setOpenCreateCategoryDialog] =
    useState(false)

  return (
    <Protect permission="org:app:access" fallback={<AccessDenied />}>
      <div className="flex min-h-[calc(100vh-20rem)] w-full flex-col space-y-4">
        <CreateCategoryDialog
          open={openCreateCategoryDialog}
          onOpenChange={setOpenCreateCategoryDialog}
        />

        <Form {...form}>
          <form onSubmit={onSubmit} className="grid gap-8 lg:grid-cols-2">
            <div className="space-y-6">
              <h2 className="font-semibold text-xl">Detalles del producto</h2>
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre</FormLabel>
                      <FormControl>
                        <Input type="text" autoFocus {...field} />
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
                        <Textarea {...field} />
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Precio</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              className="peer ps-6 pe-12"
                              placeholder="0.00"
                              type="text"
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
                            className="tabular-nums"
                            placeholder="0.00"
                            type="text"
                            {...field}
                          />
                        </FormControl>

                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoría</FormLabel>
                      <FormControl>
                        <Popover
                          open={openCategorySelect}
                          onOpenChange={setOpenCategorySelect}
                        >
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={openCategorySelect}
                              className="w-full justify-between border-input bg-background px-3 font-normal outline-none outline-offset-0 hover:bg-background focus-visible:outline-[3px]"
                            >
                              <span
                                className={cn(
                                  'truncate',
                                  !field.value && 'text-muted-foreground',
                                )}
                              >
                                {field.value
                                  ? categories?.find(
                                      (category) => category.id === field.value,
                                    )?.name
                                  : 'Seleccionar una categoria'}
                              </span>
                              <ChevronDownIcon
                                size={16}
                                className="shrink-0 text-muted-foreground/80"
                                aria-hidden="true"
                              />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent
                            className="w-full min-w-[var(--radix-popper-anchor-width)] border-input p-0"
                            align="start"
                          >
                            <Command>
                              <CommandInput placeholder="Buscar categorias" />
                              <CommandList>
                                <CommandEmpty>
                                  No se encontraron categorias.
                                </CommandEmpty>
                                <CommandGroup>
                                  {categories?.map((category) => (
                                    <CommandItem
                                      key={category.id}
                                      value={category.id}
                                      onSelect={(currentValue) => {
                                        field.onChange(
                                          currentValue === field.value
                                            ? ''
                                            : currentValue,
                                        )
                                        setOpenCategorySelect(false)
                                      }}
                                    >
                                      {category.name}
                                      {field.value === category.id && (
                                        <CheckIcon
                                          size={16}
                                          className="ml-auto"
                                        />
                                      )}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                                <CommandSeparator />
                                <CommandGroup>
                                  <Button
                                    variant="ghost"
                                    className="w-full justify-start font-normal"
                                    onClick={() =>
                                      setOpenCreateCategoryDialog(true)
                                    }
                                  >
                                    <PlusIcon
                                      size={16}
                                      className="-ms-2 opacity-60"
                                      aria-hidden="true"
                                    />
                                    Agregar categoria
                                  </Button>
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button
                className="w-full"
                type="submit"
                disabled={createProductMutation.isPending}
              >
                Crear producto
              </Button>
            </div>

            <div className="space-y-6">
              <h2 className="font-semibold text-xl">Imágenes del producto</h2>

              <div className="flex flex-col space-y-4">
                <Label>Imagen principal</Label>

                {mainImage ? (
                  <div className="relative h-64 w-full overflow-hidden rounded-md border border-border">
                    <img
                      src={mainImageUrl || '/placeholder.svg'}
                      alt="Main product image"
                      className="object-contain"
                      style={{
                        width: '100%',
                        height: '100%',
                        position: 'absolute',
                        inset: 0,
                        color: 'transparent',
                      }}
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-8 w-8 rounded-full"
                      onClick={removeMainImage}
                    >
                      <XIcon className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div
                    className={`flex h-64 cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed transition-colors ${isDragActive ? 'border-primary bg-primary/5' : 'hover:border-primary'}`}
                    {...getRootProps()}
                  >
                    <Label
                      htmlFor="main-image"
                      className="flex h-full w-full cursor-pointer flex-col items-center justify-center"
                    >
                      <UploadIcon className="mb-2 h-10 w-10 text-muted-foreground" />
                      <p className="font-medium text-sm">
                        Arrastra y suelta una imagen aquí o haz clic para
                        seleccionar una imagen
                      </p>
                      <p className="mt-1 text-muted-foreground text-xs">
                        PNG, JPG. Tamaño máximo: 5MB
                      </p>
                    </Label>
                    <Input {...getInputProps()} />
                  </div>
                )}
              </div>
            </div>
          </form>
        </Form>
      </div>
    </Protect>
  )
}
