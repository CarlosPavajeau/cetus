import { api } from '@cetus/api-client'
import { createSaleSchema } from '@cetus/schemas/order.schema'
import {
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
import { Currency } from '@cetus/web/components/currency'
import { SubmitButton } from '@cetus/web/components/submit-button'
import { Input } from '@cetus/web/components/ui/input'
import { arktypeResolver } from '@hookform/resolvers/arktype'
import { useMutation } from '@tanstack/react-query'
import { Image } from '@unpic/react'
import { XIcon } from 'lucide-react'
import { useCallback, useState } from 'react'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import {
  ProductSearchInline,
  type SelectedProductVariant,
} from './product-search-inline'
import { QuantityInput } from './quantity-input'

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
      channel: undefined,
      paymentMethod: undefined,
      paymentStatus: 'pending',
    },
  })

  const { fields, append } = useFieldArray({
    control: form.control,
    name: 'items',
  })

  const total = form.watch('items').reduce((acc, item) => {
    const price =
      selectedProduct?.id === item.variantId ? selectedProduct.price : 0
    return acc + item.quantity * price
  }, 0)

  const handleProductSelect = useCallback(
    (product: SelectedProductVariant) => {
      setSelectedProduct(product)
      append({ quantity: 1, variantId: product.id })
    },
    [append],
  )

  const handleClearProduct = useCallback(() => {
    setSelectedProduct(undefined)
    form.setValue('items', [])
  }, [form])

  const { mutateAsync } = useMutation({
    mutationKey: ['sales'],
    mutationFn: api.orders.createSale,
    onSuccess: () => {
      toast.success('Venta registrada con éxito')

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
      <SheetContent className="max-h-[95vh] overflow-y-auto" side="bottom">
        <SheetHeader>
          <SheetTitle>Venta rápida</SheetTitle>
          <SheetDescription>Registra una venta en segundos</SheetDescription>
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
                    <p className="mt-1 text-destructive text-xs">
                      {fieldState.error.message}
                    </p>
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
                    <p className="mt-1 text-destructive text-xs">
                      {fieldState.error.message}
                    </p>
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
