import { api } from '@cetus/api-client'
import { authClient } from '@cetus/auth/client'
import { adjustInventoryStockSchema } from '@cetus/schemas/product.schema'
import { Badge } from '@cetus/ui/badge'
import { Button } from '@cetus/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@cetus/ui/dropdown-menu'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@cetus/ui/empty'
import { Input } from '@cetus/ui/input'
import { Item, ItemContent, ItemTitle } from '@cetus/ui/item'
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
import { SubmitButton } from '@cetus/web/components/submit-button'
import { Kbd } from '@cetus/web/components/ui/kbd'
import {
  SearchProductsDialog,
  type SelectedProductVariant,
} from '@cetus/web/features/products/components/search-products-dialog'
import { cn } from '@cetus/web/shared/utils'
import { arktypeResolver } from '@hookform/resolvers/arktype'
import { useMutation } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import consola from 'consola'
import {
  AlertTriangleIcon,
  MoreVerticalIcon,
  PackageIcon,
  SaveIcon,
  ScanBarcodeIcon,
  SearchIcon,
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

type AdjustmentsFormValues = {
  userId: string
  adjustments: {
    variantId: number
    type: 'delta' | 'snapshot'
    value: number
  }[]
}

const ProductInfo = ({ variant }: { variant: SelectedProductVariant }) => (
  <Item className="w-full p-0" key={variant.sku} role="listitem" size="sm">
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
  const hasIncreased = newStock > currentStock

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
      {isNegative && (
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

  return (
    <TableRow>
      <TableCell>
        <ProductInfo variant={variant} />
      </TableCell>
      <TableCell>{variant.stock ?? 'Desconocido'}</TableCell>
      <TableCell className="w-[250px]">
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
      <TableCell className="w-[120px]">
        <Controller
          control={control}
          name={`adjustments.${index}.value`}
          render={({ field }) => <Input {...field} type="number" />}
        />
      </TableCell>
      <TableCell className="text-right">
        <NewStockIndicator
          currentStock={variant.stock ?? 0}
          newStock={calculateNewStock(type, Number(value), variant.stock ?? 0)}
        />
      </TableCell>
      <TableCell className="text-right">
        <Button
          appearance="ghost"
          mode="icon"
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

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-start justify-between">
        <ProductInfo variant={variant} />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button appearance="ghost" mode="icon" size="icon" type="button">
              <MoreVerticalIcon size={16} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className="text-destructive"
              onSelect={() => onRemove(index)}
            >
              <Trash2Icon className="mr-2 h-4 w-4" />
              Remover
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="mt-4 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-sm">Stock actual</span>
          <span className="font-medium">{variant.stock ?? 'Desconocido'}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-sm">Operacion</span>
          <div className="w-[150px]">
            <Controller
              control={control}
              name={`adjustments.${index}.type`}
              render={({ field }) => (
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
              )}
            />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-sm">Valor</span>
          <div className="w-[100px]">
            <Controller
              control={control}
              name={`adjustments.${index}.value`}
              render={({ field }) => <Input {...field} type="number" />}
            />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-sm">Stock nuevo</span>
          <NewStockIndicator
            currentStock={variant.stock ?? 0}
            newStock={calculateNewStock(
              type,
              Number(value),
              variant.stock ?? 0,
            )}
          />
        </div>
      </div>
    </div>
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
  }, [session, isPending, form.setValue])

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

      const isAlreadyAdded = fields.some(
        (field) => field.variantId === selected.id,
      )

      if (isAlreadyAdded) {
        consola.warn(
          `El producto "${selected.name}" ya ha sido agregado a la lista.`,
        )
        return
      }

      append({ variantId: selected.id, type: 'delta', value: 0 })
      setSelectedProducts((prev) => ({ ...prev, [selected.id]: selected }))
    },
    [append, fields],
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
  })

  const handleSubmit = form.handleSubmit(async (data) => {
    await mutateAsync(data)
  })

  const handleReset = useCallback(() => {
    form.reset({ userId: session?.user.id ?? '', adjustments: [] })
    setSelectedProducts({})
  }, [form, session])

  const adjustments = form.watch('adjustments')
  const isEmpty = adjustments.length === 0

  return (
    <FormProvider {...form}>
      <form id="inventory-adjustment-form" onSubmit={handleSubmit}>
        <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl flex-col px-4 sm:px-6 lg:px-8">
          <div className="sticky top-0 z-10 space-y-4 bg-background py-4">
            <Button
              className="relative w-full"
              mode="input"
              onClick={() => setSearchDialogOpen(true)}
              type="button"
              variant="outline"
            >
              <SearchIcon />
              Buscar productos...
              <Kbd className="-translate-y-1/2 pointer-events-none absolute top-1/2 right-[5px] hidden select-none px-1.5 font-medium font-mono text-[10px] opacity-100 sm:flex">
                Ctrl + J
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
                <h2 className="flex items-center gap-2 font-semibold text-sm">
                  Productos agregados
                  <Badge shape="circle" variant="secondary">
                    {fields.length}
                  </Badge>
                </h2>
                <Button
                  appearance="ghost"
                  onClick={handleReset}
                  size="sm"
                  type="button"
                  variant="destructive"
                >
                  Descartar ajuste
                </Button>
              </div>

              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead>Stock actual</TableHead>
                      <TableHead>Operacion</TableHead>
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
                    {fields.length} ajuste{fields.length !== 1 ? 's' : ''} de
                    inventario
                  </span>
                  <span className="text-muted-foreground text-sm">
                    {validFields} ajuste{validFields !== 1 ? 's' : ''} válido
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
