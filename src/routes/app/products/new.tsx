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
import { toast } from 'sonner'
import { v4 as uuid } from 'uuid'
import { type TypeOf, z } from 'zod'

export const Route = createFileRoute('/app/products/new')({
  component: RouteComponent,
})

/**
 * Accepted file types for product images
 */
const ACCEPTED_FILE_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
}

/**
 * Maximum file size (5MB)
 */
const MAX_FILE_SIZE = 5 * 1024 * 1024

/**
 * Schema for product creation form with improved validation
 */
export const createProductSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  description: z
    .string()
    .optional()
    .transform((value) => (value?.trim() === '' ? undefined : value)),
  price: z.coerce.number().min(0, 'El precio debe ser mayor o igual a 0'),
  stock: z.coerce.number().int().min(0, 'El stock debe ser mayor o igual a 0'),
  imageUrl: z.string().min(1, 'La imagen es requerida'),
  categoryId: z.string().min(1, 'La categoría es requerida'),
})

export type FormValues = TypeOf<typeof createProductSchema>

/**
 * Custom hook to handle image upload
 */
function useImageUpload(form: ReturnType<typeof useForm<FormValues>>) {
  const [mainImage, setMainImage] = useState<File | null>(null)

  // Create and memoize image URL
  const mainImageUrl = useMemo(
    () => (mainImage ? URL.createObjectURL(mainImage) : undefined),
    [mainImage],
  )

  // Clean up URL objects to prevent memory leaks
  useEffect(() => {
    return () => {
      if (mainImageUrl) URL.revokeObjectURL(mainImageUrl)
    }
  }, [mainImageUrl])

  // Handle image drop
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

  // Configure dropzone
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    maxSize: MAX_FILE_SIZE,
    accept: ACCEPTED_FILE_TYPES,
  })

  // Remove image
  const removeImage = useCallback(() => {
    setMainImage(null)
    form.setValue('imageUrl', '')
  }, [form])

  return {
    mainImage,
    mainImageUrl,
    getRootProps,
    getInputProps,
    isDragActive,
    removeImage,
  }
}

/**
 * Custom hook to handle product submission
 */
function useProductSubmit(mainImage: File | null) {
  const navigate = useNavigate()

  return useMutation({
    mutationFn: async (values: FormValues) => {
      try {
        if (mainImage) {
          await uploadFileToS3({ fileName: values.imageUrl, file: mainImage })
        }
        return createProduct(values)
      } catch (error) {
        console.error('Failed to create product:', error)
        throw error
      }
    },
    onSuccess: () => {
      navigate({ to: '/app/products' })
    },
  })
}

/**
 * Image upload component
 */
type ImageUploaderProps = {
  form: ReturnType<typeof useForm<FormValues>>
  mainImage: File | null
  mainImageUrl: string | undefined
  getRootProps: ReturnType<typeof useDropzone>['getRootProps']
  getInputProps: ReturnType<typeof useDropzone>['getInputProps']
  isDragActive: boolean
  removeImage: () => void
}

function ImageUploader({
  form,
  mainImage,
  mainImageUrl,
  getRootProps,
  getInputProps,
  isDragActive,
  removeImage,
}: ImageUploaderProps) {
  return (
    <div className="*:not-first:mt-2">
      <Label htmlFor="image">Imagen principal</Label>
      <div
        {...getRootProps()}
        className={cn(
          'relative flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-md border border-muted-foreground/25 border-dashed px-6 py-8 text-center transition-colors hover:bg-accent/50',
          isDragActive && 'border-muted-foreground/50',
          mainImage && 'border-0',
        )}
      >
        <input {...getInputProps()} />

        {mainImage ? (
          <>
            <img
              src={mainImageUrl}
              alt="Preview"
              className="max-h-64 w-full object-contain"
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2"
              onClick={(e) => {
                e.stopPropagation()
                removeImage()
              }}
            >
              <XIcon className="size-4" />
            </Button>
          </>
        ) : (
          <div className="space-y-2">
            <div className="flex justify-center">
              <UploadIcon className="size-8 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="font-medium text-sm">
                Arrastra y suelta o haz clic para seleccionar
              </p>
              <p className="text-muted-foreground text-xs">
                JPG, PNG, WEBP (max. 5MB)
              </p>
            </div>
          </div>
        )}
      </div>
      <FormMessage />
    </div>
  )
}

/**
 * Category selector component
 */
type CategorySelectorProps = {
  form: ReturnType<typeof useForm<FormValues>>
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

/**
 * Main component for creating a new product
 */
function RouteComponent() {
  const { categories } = useCategories()

  // Form setup with default values
  const form = useForm<FormValues>({
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

  // Use custom hooks
  const {
    mainImage,
    mainImageUrl,
    getRootProps,
    getInputProps,
    isDragActive,
    removeImage,
  } = useImageUpload(form)

  const createProductMutation = useProductSubmit(mainImage)

  // Category dialog state
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false)
  const openCategoryDialog = useCallback(() => {
    setIsCategoryDialogOpen(true)
  }, [])

  // Form submission handler
  const onSubmit = useCallback(
    async (values: FormValues) => {
      try {
        await createProductMutation.mutateAsync(values)
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Error desconocido'
        toast.error(`Error al crear el producto: ${errorMessage}`)
      }
    },
    [createProductMutation],
  )

  return (
    <Protect permission="org:app:access" fallback={<AccessDenied />}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-bold font-heading text-2xl text-foreground">
            Crear producto
          </h1>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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
                          <Input
                            type="number"
                            placeholder="0"
                            {...field}
                            onChange={(e) => {
                              const value = e.target.value
                              field.onChange(value === '' ? 0 : Number(value))
                            }}
                          />
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
                            placeholder="0"
                            {...field}
                            onChange={(e) => {
                              const value = e.target.value
                              field.onChange(value === '' ? 0 : Number(value))
                            }}
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
