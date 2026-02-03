import { api } from '@cetus/api-client'
import { createSaleSchema } from '@cetus/schemas/order.schema'
import {
  defaultCityId,
  paymentStatus,
  saleChannels,
  salePaymentMethods,
} from '@cetus/shared/constants/order'
import { getImageUrl } from '@cetus/shared/utils/image'
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@cetus/ui/field'
import { Input } from '@cetus/ui/input'
import { Label } from '@cetus/ui/label'
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
import { QuantityInput } from '@cetus/web/features/quick-sales/components/quantity-input'
import { UpdateSaleLocationDialog } from '@cetus/web/features/quick-sales/components/update-sale-location-dialog'
import { arktypeResolver } from '@hookform/resolvers/arktype'
import { MapPinpoint01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useDebounce } from '@uidotdev/usehooks'
import { Image } from '@unpic/react'
import { XIcon } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
import { toast } from 'sonner'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function QuickSaleSheet({ open, onOpenChange }: Readonly<Props>) {
  const [selectedProduct, setSelectedProduct] = useState<
    SelectedProductVariant | undefined
  >(undefined)

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

  const { fields, append } = useFieldArray({
    control: form.control,
    name: 'items',
  })

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
  }, [customer, customerPhone, isCustomerLoading, form])

  const cityId = form.watch('shipping.cityId') ?? ''
  const { data: city, isLoading: isCityLoading } = useQuery({
    queryKey: ['cities', 'by-id', cityId],
    queryFn: () => api.states.getCity(cityId),
    enabled: !!cityId,
  })

  const total = form.watch('items').reduce((acc, item) => {
    const price =
      selectedProduct?.id === item.variantId ? selectedProduct.price : 0
    return acc + item.quantity * price
  }, 0)

  const handleProductSelect = useCallback(
    (product: SelectedProductVariant) => {
      if (product.stock <= 0) {
        toast.error('Producto agotado')
        return
      }

      setSelectedProduct(product)
      append({ quantity: 1, variantId: product.id })
    },
    [append],
  )

  const handleClearProduct = useCallback(() => {
    setSelectedProduct(undefined)
    form.setValue('items', [])
  }, [form])

  const queryClient = useQueryClient()
  const { mutateAsync } = useMutation({
    mutationKey: ['sales'],
    mutationFn: api.orders.createSale,
    onSuccess: () => {
      toast.success('Venta registrada con éxito')

      queryClient.invalidateQueries({ queryKey: ['orders'] })

      form.reset()
      setSelectedProduct(undefined)
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
          {selectedProduct ? (
            <div className="flex items-center gap-3 rounded-lg border p-1">
              <Image
                alt={selectedProduct.name}
                className="rounded-md object-cover"
                height={48}
                layout="constrained"
                objectFit="cover"
                src={getImageUrl(selectedProduct.imageUrl || 'placeholder.svg')}
                width={48}
              />
              <div className="flex-1 space-y-0.5">
                <p className="line-clamp-1 font-medium text-sm">
                  {selectedProduct.name}
                </p>

                <div className="flex items-center gap-2">
                  {selectedProduct.optionValues.map((value) => (
                    <span
                      className="text-muted-foreground text-xs"
                      key={value.id}
                    >
                      {value.optionTypeName}: {value.value}
                    </span>
                  ))}
                </div>

                <p className="text-muted-foreground text-sm">
                  <Currency currency="COP" value={selectedProduct.price} />
                </p>
              </div>
              <button
                className="rounded-md p-1 text-muted-foreground hover:text-foreground"
                onClick={handleClearProduct}
                type="button"
              >
                <XIcon className="size-4" />
                <span className="sr-only">Quitar producto</span>
              </button>
            </div>
          ) : (
            <ProductSearchInline onSelect={handleProductSelect} />
          )}

          {selectedProduct && (
            <>
              {fields.map((field, index) => (
                <div className="space-y-2" key={field.id}>
                  <Label>Cantidad</Label>
                  <Controller
                    control={form.control}
                    name={`items.${index}.quantity`}
                    render={({ field }) => (
                      <QuantityInput
                        max={selectedProduct.stock}
                        onChange={field.onChange}
                        value={field.value}
                      />
                    )}
                  />
                </div>
              ))}

              <div className="flex items-center justify-between rounded-lg bg-muted p-3">
                <span className="font-medium text-sm">Total</span>
                <span className="font-semibold text-lg">
                  <Currency currency="COP" value={total} />
                </span>
              </div>
            </>
          )}

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
              disabled={isCustomerLoading}
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
