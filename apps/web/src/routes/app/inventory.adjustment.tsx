import { api } from '@cetus/api-client'
import { authClient } from '@cetus/auth/client'
import { adjustInventoryStockSchema } from '@cetus/schemas/product.schema'
import { Badge } from '@cetus/ui/badge'
import { Button } from '@cetus/ui/button'
import { Card } from '@cetus/ui/card'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@cetus/ui/dialog'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@cetus/ui/empty'
import { Field, FieldError, FieldGroup, FieldLabel } from '@cetus/ui/field'
import { Input } from '@cetus/ui/input'
import { Item, ItemContent, ItemTitle } from '@cetus/ui/item'
import { Kbd } from '@cetus/ui/kbd'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@cetus/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@cetus/ui/table'
import { Textarea } from '@cetus/ui/textarea'
import { SubmitButton } from '@cetus/web/components/submit-button'
import {
  SearchProductsDialog,
  type SelectedProductVariant,
} from '@cetus/web/features/products/components/search-products-dialog'
import { cn } from '@cetus/web/shared/utils'
import { arktypeResolver } from '@hookform/resolvers/arktype'
import { useMutation } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import {
  AlertTriangleIcon,
  MessageSquareIcon,
  PackageIcon,
  SaveIcon,
  ScanBarcodeIcon,
  Trash2Icon,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import {
  type Control,
  Controller,
  FormProvider,
  useFieldArray,
  useForm,
  useFormContext,
} from 'react-hook-form'
import { toast } from 'sonner'

export const Route = createFileRoute('/app/inventory/adjustment')({
  component: RouteComponent,
})

type AdjustmentsFormValues = typeof adjustInventoryStockSchema.infer

function GlobalReasonDialog() {
  const [open, setOpen] = useState(false)
  const [draftGlobalReason, setDraftGlobalReason] = useState('')
  const form = useFormContext<AdjustmentsFormValues>()

  return (
    <Dialog
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (nextOpen) {
          setDraftGlobalReason(form.getValues('globalReason') ?? '')
        }
      }}
      open={open}
    >
      <DialogTrigger asChild>
        <Button
          aria-label="Agregar motivo global"
          size="icon-sm"
          title="Agregar motivo global"
          type="button"
          variant="secondary"
        >
          <MessageSquareIcon aria-hidden="true" />
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Motivo global</DialogTitle>
          <DialogDescription>
            Este motivo se aplicará a todos los ajustes de inventario.
          </DialogDescription>
        </DialogHeader>

        <div>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="globalReason">Motivo (opcional)</FieldLabel>
              <Textarea
                autoComplete="off"
                id="globalReason"
                maxLength={100}
                onChange={(e) => setDraftGlobalReason(e.target.value)}
                placeholder="Ej: Ajuste por conteo físico"
                value={draftGlobalReason}
              />
            </Field>
          </FieldGroup>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancelar
            </Button>
          </DialogClose>
          <Button
            onClick={() => {
              const trimmed = draftGlobalReason.trim()
              form.setValue(
                'globalReason',
                trimmed === '' ? undefined : trimmed,
                {
                  shouldDirty: true,
                  shouldValidate: true,
                },
              )
              setOpen(false)
            }}
            type="button"
          >
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const ProductInfo = ({ variant }: { variant: SelectedProductVariant }) => (
  <Item className="w-full p-0" key={variant.sku} size="sm">
    <ItemContent>
      <ItemTitle className="line-clamp-1">{variant.name}</ItemTitle>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          {variant.optionValues.map((value) => (
            <span className="text-muted-foreground text-xs" key={value.id}>
              {value.optionTypeName}: {value.value}
            </span>
          ))}
        </div>
      </div>
    </ItemContent>
  </Item>
)

const NewStockIndicator = ({
  newStock,
  currentStock,
}: {
  newStock: number
  currentStock: number
}) => {
  const isNegative = newStock < 0

  const getStatusColor = () => {
    if (newStock > currentStock) {
      return 'text-success-base'
    }

    if (newStock < currentStock) {
      return 'text-destructive'
    }

    return 'text-muted-foreground'
  }

  const getStatusIcon = () => {
    if (newStock > currentStock) {
      return '↑'
    }

    if (newStock < currentStock) {
      return '↓'
    }

    return '→'
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center justify-end gap-2 font-medium font-mono">
        <span className={cn(getStatusColor())}>{newStock}</span>
        <span className={cn('w-3 text-xs', getStatusColor())}>
          {getStatusIcon()}
        </span>
      </div>
      {!!isNegative && (
        <div className="flex items-center justify-end gap-1 text-[10px] text-destructive">
          <AlertTriangleIcon size={10} /> Negativo
        </div>
      )}
    </div>
  )
}

const calculateNewStock = (
  adjustmentType: 'delta' | 'snapshot',
  adjustmentValue: number,
  currentStock: number,
) => {
  if (adjustmentType === 'delta') {
    return currentStock + adjustmentValue
  }
  return adjustmentValue
}

const AdjustmentTableRow = ({
  control,
  index,
  variant,
  onRemove,
}: {
  control: Control<AdjustmentsFormValues>
  index: number
  variant: SelectedProductVariant
  onRemove: (index: number) => void
}) => {
  const { type, value } = useFormContext<AdjustmentsFormValues>().watch(
    `adjustments.${index}`,
  )

  const numericValue = Number.isFinite(Number(value)) ? Number(value) : 0

  return (
    <TableRow>
      <TableCell>
        <ProductInfo variant={variant} />
      </TableCell>
      <TableCell>{variant.stock ?? 'Desconocido'}</TableCell>
      <TableCell className="w-62.5">
        <Controller
          control={control}
          name={`adjustments.${index}.type`}
          render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar operación" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="delta">Agregar / Remover</SelectItem>
                  <SelectItem value="snapshot">Establecer cantidad</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          )}
        />
      </TableCell>
      <TableCell className="w-60">
        <Controller
          control={control}
          name={`adjustments.${index}.value`}
          render={({ field, fieldState }) => (
            <Field className="w-full">
              <Input
                onBlur={(e) => {
                  const value = e.target.value
                  field.onChange(value === '' ? undefined : Number(value))
                  field.onBlur()
                }}
                onChange={(e) => {
                  const value = e.target.value
                  field.onChange(value === '' ? '' : Number(value))
                }}
                type="number"
                value={field.value === undefined ? '' : field.value}
              />
              {!!fieldState.invalid && (
                <FieldError errors={[fieldState.error]} />
              )}
            </Field>
          )}
        />
      </TableCell>
      <TableCell className="text-right">
        <NewStockIndicator
          currentStock={variant.stock ?? 0}
          newStock={calculateNewStock(type, numericValue, variant.stock ?? 0)}
        />
      </TableCell>
      <TableCell className="text-right">
        <Button
          aria-label="Eliminar producto"
          onClick={() => onRemove(index)}
          size="icon"
          type="button"
          variant="destructive"
        >
          <Trash2Icon size={16} />
        </Button>
      </TableCell>
    </TableRow>
  )
}

const AdjustmentCard = ({
  control,
  index,
  variant,
  onRemove,
}: {
  control: Control<AdjustmentsFormValues>
  index: number
  variant: SelectedProductVariant
  onRemove: (index: number) => void
}) => {
  const { type, value } = useFormContext<AdjustmentsFormValues>().watch(
    `adjustments.${index}`,
  )

  const numericValue = Number.isFinite(Number(value)) ? Number(value) : 0

  return (
    <Card className="relative gap-4 p-4">
      <div className="absolute top-2 right-2 flex items-center gap-1">
        <Button
          aria-label="Eliminar producto"
          onClick={() => onRemove(index)}
          size="icon-xs"
          type="button"
          variant="ghost"
        >
          <Trash2Icon />
        </Button>
      </div>
      <div>
        <ProductInfo variant={variant} />
        <span className="text-muted-foreground text-xs">
          Stock actual: {variant.stock}
        </span>
      </div>

      <div className="grid grid-cols-1 items-end gap-3">
        <FieldGroup>
          <Controller
            control={control}
            name={`adjustments.${index}.type`}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>Operación</FieldLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="delta">Agregar / Remover</SelectItem>
                      <SelectItem value="snapshot">
                        Establecer cantidad
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
                {!!fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <Controller
            control={control}
            name={`adjustments.${index}.value`}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>Valor</FieldLabel>
                <Input
                  onBlur={(e) => {
                    const value = e.target.value
                    field.onChange(value === '' ? undefined : Number(value))
                    field.onBlur()
                  }}
                  onChange={(e) => {
                    const value = e.target.value
                    field.onChange(value === '' ? '' : Number(value))
                  }}
                  type="number"
                  value={field.value === undefined ? '' : field.value}
                />

                {!!fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-sm">Stock nuevo</span>
            <NewStockIndicator
              currentStock={variant.stock ?? 0}
              newStock={calculateNewStock(
                type,
                numericValue,
                variant.stock ?? 0,
              )}
            />
          </div>
        </FieldGroup>
      </div>
    </Card>
  )
}

const AdjustmentsEmptyState = () => (
  <Empty>
    <EmptyHeader>
      <EmptyMedia variant="icon">
        <ScanBarcodeIcon />
      </EmptyMedia>
      <EmptyTitle>Sin ajustes de inventario</EmptyTitle>
      <EmptyDescription>
        Busque y seleccione productos para comenzar a ajustar el inventario.
      </EmptyDescription>
    </EmptyHeader>
  </Empty>
)

function RouteComponent() {
  const [searchDialogOpen, setSearchDialogOpen] = useState(false)
  const [selectedProducts, setSelectedProducts] = useState<
    Record<number, SelectedProductVariant>
  >({})
  const { data: session, isPending } = authClient.useSession()

  const form = useForm<AdjustmentsFormValues>({
    resolver: arktypeResolver(adjustInventoryStockSchema),
    defaultValues: {
      globalReason: '',
      userId: '',
      adjustments: [],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'adjustments',
  })

  const validFields = fields.filter(
    (_, index) => !form.formState.errors?.adjustments?.[index],
  ).length

  useEffect(() => {
    if (isPending) {
      return
    }

    if (session?.user.id) {
      form.setValue('userId', session.user.id)
    }
  }, [session, isPending, form])

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'j' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setSearchDialogOpen((open) => !open)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  const handleSelectProduct = useCallback(
    (selected: SelectedProductVariant) => {
      setSearchDialogOpen(false)

      const currentAdjustments = form.getValues('adjustments')
      const isAlreadyAdded = currentAdjustments.some(
        (adjustment) => adjustment.variantId === selected.id,
      )

      if (isAlreadyAdded) {
        toast.warning(`El producto "${selected.name}" ya está en la lista.`)
        return
      }

      append({ variantId: selected.id, type: 'delta', value: 0 })
      setSelectedProducts((prev) => ({ ...prev, [selected.id]: selected }))
    },
    [append, form],
  )

  const handleRemoveProduct = useCallback(
    (index: number) => {
      const variantId = form.getValues('adjustments')[index]?.variantId
      if (!variantId) {
        return
      }

      remove(index)
      setSelectedProducts((prev) => {
        const next = { ...prev }
        delete next[variantId]
        return next
      })
    },
    [form, remove],
  )

  const { mutateAsync } = useMutation({
    mutationKey: ['products', 'inventory', 'adjustment'],
    mutationFn: api.inventory.adjustStock,
    onSuccess: () => {
      toast.success('Ajustes de inventario aplicados correctamente.')
      handleReset()
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Error al aplicar los ajustes de inventario.',
      )
    },
  })

  const handleSubmit = form.handleSubmit(async (data) => {
    await mutateAsync(data)
  })

  const handleReset = useCallback(() => {
    form.reset({
      globalReason: undefined,
      userId: session?.user.id ?? '',
      adjustments: [],
    })
    setSelectedProducts({})
  }, [form, session])

  const adjustments = form.watch('adjustments')
  const isEmpty = adjustments.length === 0

  return (
    <FormProvider {...form}>
      <form id="inventory-adjustment-form" onSubmit={handleSubmit}>
        <div className="mx-auto flex min-h-[calc(100vh-4rem)] flex-col px-4 sm:px-6 lg:px-8">
          <div className="sticky top-0 z-10 space-y-4 bg-background py-4">
            <Button
              onClick={() => setSearchDialogOpen(true)}
              type="button"
              variant="outline"
            >
              Agregar un producto
              <Kbd className="translate-x-0.5" data-icon="inline-end">
                {typeof navigator !== 'undefined' &&
                navigator.userAgent.includes('Mac')
                  ? '⌘'
                  : 'Ctrl'}{' '}
                + J
              </Kbd>
            </Button>
          </div>

          <SearchProductsDialog
            onOpenChange={setSearchDialogOpen}
            onSelect={handleSelectProduct}
            open={searchDialogOpen}
          />

          {isEmpty ? (
            <AdjustmentsEmptyState />
          ) : (
            <main className="mx-auto w-full flex-1">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm">
                  Productos agregados
                  <Badge variant="secondary">{fields.length}</Badge>
                </h2>
                <div className="flex gap-2">
                  <GlobalReasonDialog />
                  <Button
                    onClick={handleReset}
                    size="sm"
                    type="button"
                    variant="destructive"
                  >
                    Descartar ajuste
                  </Button>
                </div>
              </div>

              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead>Stock actual</TableHead>
                      <TableHead>Operación</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead className="text-right">Stock nuevo</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((field, index) => {
                      const variant = selectedProducts[field.variantId]
                      if (!variant) {
                        return null
                      }

                      return (
                        <AdjustmentTableRow
                          control={form.control}
                          index={index}
                          key={field.id}
                          onRemove={handleRemoveProduct}
                          variant={variant}
                        />
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="space-y-4 md:hidden">
                {fields.map((field, index) => {
                  const variant = selectedProducts[field.variantId]
                  if (!variant) {
                    return null
                  }

                  return (
                    <AdjustmentCard
                      control={form.control}
                      index={index}
                      key={field.id}
                      onRemove={handleRemoveProduct}
                      variant={variant}
                    />
                  )
                })}
              </div>
            </main>
          )}

          <div className="sticky bottom-0 z-20 border-t bg-background py-4">
            <div className="flex flex-col items-center justify-between gap-4 bg-background sm:flex-row">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-muted p-2">
                  <PackageIcon className="h-5 w-5" />
                </div>
                <div className="flex flex-col">
                  <span className="font-medium">
                    {fields.length} {fields.length === 1 ? 'ajuste' : 'ajustes'}{' '}
                    de inventario
                  </span>
                  <span className="text-muted-foreground text-sm">
                    {validFields}{' '}
                    {validFields === 1 ? 'ajuste válido' : 'ajustes válidos'}
                  </span>
                </div>
              </div>
              <div className="flex w-full items-center gap-3 sm:w-auto">
                <SubmitButton
                  disabled={isEmpty}
                  form="inventory-adjustment-form"
                  isSubmitting={form.formState.isSubmitting}
                >
                  <div className="flex items-center gap-2">
                    <SaveIcon className="h-4 w-4" />
                    Aplicar ajustes
                  </div>
                </SubmitButton>
              </div>
            </div>
          </div>
        </div>
      </form>
    </FormProvider>
  )
}
