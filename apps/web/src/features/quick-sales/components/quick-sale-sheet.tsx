import { api } from '@cetus/api-client'
import { createSaleSchema } from '@cetus/schemas/order.schema'
import {
  defaultCityId,
  paymentStatus,
  saleChannels,
  salePaymentMethods,
} from '@cetus/shared/constants/order'
import { Button } from '@cetus/ui/button'
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@cetus/ui/field'
import { Input } from '@cetus/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@cetus/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@cetus/ui/sheet'
import { Skeleton } from '@cetus/ui/skeleton'
import { Currency } from '@cetus/web/components/currency'
import { SubmitButton } from '@cetus/web/components/submit-button'
import {
  ProductSearchInline,
  type SelectedProductVariant,
} from '@cetus/web/features/quick-sales/components/product-search-inline'
import { SaleLineItem } from '@cetus/web/features/quick-sales/components/sale-line-item'
import { UpdateSaleLocationDialog } from '@cetus/web/features/quick-sales/components/update-sale-location-dialog'
import { arktypeResolver } from '@hookform/resolvers/arktype'
import { MapPinpoint01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useDebounce } from '@uidotdev/usehooks'
import { AnimatePresence, motion } from 'framer-motion'
import { PlusIcon } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
import { toast } from 'sonner'

const MAX_PRODUCTS = 20

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function QuickSaleSheet({ open, onOpenChange }: Readonly<Props>) {
  const [selectedProducts, setSelectedProducts] = useState<
    Map<number, SelectedProductVariant>
  >(new Map())
  const [showSearch, setShowSearch] = useState(false)

  const form = useForm({
    resolver: arktypeResolver(createSaleSchema),
    defaultValues: {
      items: [],
      customer: {
        name: '',
        phone: '',
      },
      shipping: {
        cityId: defaultCityId,
      },
      channel: undefined,
      paymentMethod: undefined,
      paymentStatus: 'pending',
    },
    mode: 'onChange',
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  })

  const hasProducts = selectedProducts.size > 0
  const canAddMore = selectedProducts.size < MAX_PRODUCTS

  const customerPhone = useDebounce(form.watch('customer.phone'), 300)
  const { data: customer, isLoading: isCustomerLoading } = useQuery({
    queryKey: ['customers', 'by-phone', customerPhone],
    queryFn: () => api.customers.getByPhone(customerPhone),
    enabled: !!customerPhone,
  })

  useEffect(() => {
    if (!customerPhone) {
      form.setValue('customer.name', '')
      return
    }

    if (!isCustomerLoading) {
      form.setValue('customer.name', customer?.name ?? '')
    }
  }, [customer, customerPhone, isCustomerLoading, form.setValue])

  const cityId = form.watch('shipping.cityId') ?? ''
  const { data: city, isLoading: isCityLoading } = useQuery({
    queryKey: ['cities', 'by-id', cityId],
    queryFn: () => api.states.getCity(cityId),
    enabled: !!cityId,
  })

  const total = form.watch('items').reduce((acc, item) => {
    const product = selectedProducts.get(item.variantId)
    const price = product?.price ?? 0
    return acc + item.quantity * price
  }, 0)

  useEffect(() => {
    if (!open) {
      setSelectedProducts(new Map())
      setShowSearch(false)
    }
  }, [open])

  const handleProductSelect = useCallback(
    (product: SelectedProductVariant) => {
      if (product.stock <= 0) {
        toast.error('Producto agotado')
        return
      }

      // Duplicate detection: if variant already selected, increment quantity
      if (selectedProducts.has(product.id)) {
        const existingIndex = fields.findIndex(
          (f) => f.variantId === product.id,
        )
        if (existingIndex !== -1) {
          const currentQty = form.getValues(`items.${existingIndex}.quantity`)
          if (currentQty >= product.stock) {
            toast.error('Stock insuficiente')
            setShowSearch(false)
            return
          }
          form.setValue(`items.${existingIndex}.quantity`, currentQty + 1)
        }
        setShowSearch(false)
        return
      }

      // Cap at MAX_PRODUCTS
      if (selectedProducts.size >= MAX_PRODUCTS) {
        toast.error(`Máximo ${MAX_PRODUCTS} productos por venta`)
        return
      }

      setSelectedProducts((prev) => {
        const next = new Map(prev)
        next.set(product.id, product)
        return next
      })
      append({ quantity: 1, variantId: product.id })
      setShowSearch(false)
    },
    [append, fields, form, selectedProducts],
  )

  const handleRemoveProduct = useCallback(
    (index: number, variantId: number) => {
      remove(index)
      setSelectedProducts((prev) => {
        const next = new Map(prev)
        next.delete(variantId)
        return next
      })
    },
    [remove],
  )

  const queryClient = useQueryClient()
  const { mutateAsync } = useMutation({
    mutationKey: ['sales'],
    mutationFn: api.orders.createSale,
    onSuccess: () => {
      toast.success('Venta registrada con éxito')

      queryClient.invalidateQueries({ queryKey: ['orders'] })

      form.reset()
      setSelectedProducts(new Map())
      setShowSearch(false)
      onOpenChange(false)
    },
    onError: () => {
      toast.error('Error al registrar la venta')
    },
  })

  const onSubmit = form.handleSubmit(async (data) => {
    await mutateAsync(data)
  })

  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent className="max-h-screen overflow-y-auto" side="bottom">
        <SheetHeader>
          <SheetTitle>Venta rápida</SheetTitle>
          <SheetDescription>
            {isCityLoading && <Skeleton className="h-4 w-24" />}
            {!isCityLoading && city && (
              <div className="flex justify-between">
                <span className="inline-flex items-center gap-1.5">
                  <HugeiconsIcon
                    className="size-3.5 shrink-0"
                    icon={MapPinpoint01Icon}
                  />
                  {city.name}, {city.state}
                </span>

                <UpdateSaleLocationDialog
                  onSelectCity={(cityId) =>
                    form.setValue('shipping.cityId', cityId)
                  }
                />
              </div>
            )}
          </SheetDescription>
        </SheetHeader>

        <form
          className="flex flex-col gap-2 px-4"
          id="quick-sale-form"
          onSubmit={onSubmit}
        >
          <AnimatePresence initial={false}>
            {fields.map((field, index) => {
              const product = selectedProducts.get(field.variantId)
              if (!product) {
                return null
              }

              return (
                <motion.div
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  initial={{ opacity: 0, height: 0 }}
                  key={field.id}
                  style={{ overflow: 'hidden' }}
                >
                  <Controller
                    control={form.control}
                    name={`items.${index}.quantity`}
                    render={({ field: quantityField }) => (
                      <SaleLineItem
                        onQuantityChange={quantityField.onChange}
                        onRemove={() =>
                          handleRemoveProduct(index, field.variantId)
                        }
                        product={product}
                        quantity={quantityField.value}
                      />
                    )}
                  />
                </motion.div>
              )
            })}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {!hasProducts && (
              <motion.div
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                initial={{ opacity: 1, height: 'auto' }}
                key="initial-search"
                style={{ overflow: 'hidden' }}
              >
                <ProductSearchInline onSelect={handleProductSelect} />
              </motion.div>
            )}

            {hasProducts && showSearch && (
              <motion.div
                animate={{ opacity: 1, height: 'auto' }}
                className="flex flex-col gap-2"
                exit={{ opacity: 0, height: 0 }}
                initial={{ opacity: 0, height: 0 }}
                key="add-search"
                style={{ overflow: 'hidden' }}
              >
                <ProductSearchInline onSelect={handleProductSelect} />
                <Button
                  className="w-full"
                  onClick={() => setShowSearch(false)}
                  type="button"
                  variant="ghost"
                >
                  Cancelar
                </Button>
              </motion.div>
            )}

            {hasProducts && !showSearch && canAddMore && (
              <motion.div
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                initial={{ opacity: 0, height: 0 }}
                key="add-button"
                style={{ overflow: 'hidden' }}
              >
                <Button
                  className="w-full border-dashed"
                  onClick={() => setShowSearch(true)}
                  type="button"
                  variant="outline"
                >
                  <PlusIcon className="h-4 w-4" />
                  Agregar otro producto
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {hasProducts && (
              <motion.div
                animate={{ opacity: 1 }}
                className="flex items-center justify-between rounded-lg bg-muted p-3"
                exit={{ opacity: 0 }}
                initial={{ opacity: 0 }}
              >
                <span className="font-medium text-sm">
                  Total ({selectedProducts.size}{' '}
                  {selectedProducts.size === 1 ? 'producto' : 'productos'})
                </span>
                <span className="font-semibold text-lg">
                  <Currency currency="COP" value={total} />
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          <FieldGroup>
            <Controller
              control={form.control}
              name="customer.phone"
              render={({ field, fieldState }) => (
                <Field>
                  <FieldContent data-invalid={fieldState.invalid}>
                    <FieldLabel>Teléfono del cliente</FieldLabel>
                  </FieldContent>

                  <Input {...field} type="tel" />

                  {fieldState.error && (
                    <FieldError>{fieldState.error.message}</FieldError>
                  )}
                </Field>
              )}
            />

            <Controller
              control={form.control}
              disabled={isCustomerLoading}
              name="customer.name"
              render={({ field, fieldState }) => (
                <Field>
                  <FieldContent data-invalid={fieldState.invalid}>
                    <FieldLabel>Nombre del cliente</FieldLabel>
                  </FieldContent>

                  <Input {...field} type="text" />

                  {fieldState.error && (
                    <FieldError>{fieldState.error.message}</FieldError>
                  )}
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="shipping.address"
              render={({ field, fieldState }) => (
                <Field>
                  <FieldContent data-invalid={fieldState.invalid}>
                    <FieldLabel>Dirección de envío</FieldLabel>
                  </FieldContent>

                  <Input {...field} type="text" />

                  {fieldState.error && (
                    <FieldError>{fieldState.error.message}</FieldError>
                  )}
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="channel"
              render={({ field, fieldState }) => (
                <Field>
                  <FieldContent data-invalid={fieldState.invalid}>
                    <FieldLabel>Canal de venta</FieldLabel>
                  </FieldContent>

                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger
                      aria-invalid={fieldState.invalid}
                      className="w-full"
                    >
                      <SelectValue placeholder="Seleccionar canal" />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      {saleChannels.map((channel) => (
                        <SelectItem key={channel.value} value={channel.value}>
                          {channel.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldState.error && (
                    <FieldError>{fieldState.error.message}</FieldError>
                  )}
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="paymentMethod"
              render={({ field, fieldState }) => (
                <Field>
                  <FieldContent data-invalid={fieldState.invalid}>
                    <FieldLabel>Método de pago</FieldLabel>
                  </FieldContent>

                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger
                      aria-invalid={fieldState.invalid}
                      className="w-full"
                    >
                      <SelectValue placeholder="Seleccionar método" />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      {salePaymentMethods.map((method) => (
                        <SelectItem key={method.value} value={method.value}>
                          {method.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldState.error && (
                    <FieldError>{fieldState.error.message}</FieldError>
                  )}
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="paymentStatus"
              render={({ field, fieldState }) => (
                <Field>
                  <FieldContent data-invalid={fieldState.invalid}>
                    <FieldLabel>Estado del pago</FieldLabel>
                  </FieldContent>

                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger
                      aria-invalid={fieldState.invalid}
                      className="w-full"
                    >
                      <SelectValue placeholder="Seleccionar estado" />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      {paymentStatus.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldState.error && (
                    <FieldError>{fieldState.error.message}</FieldError>
                  )}
                </Field>
              )}
            />
          </FieldGroup>
        </form>

        <SheetFooter>
          <SubmitButton
            className="w-full"
            disabled={!form.formState.isValid}
            form="quick-sale-form"
            isSubmitting={form.formState.isSubmitting}
            size="lg"
            type="submit"
          >
            Registrar venta
          </SubmitButton>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
