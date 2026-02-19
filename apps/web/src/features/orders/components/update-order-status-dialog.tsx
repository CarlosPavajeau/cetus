import { api } from '@cetus/api-client'
import type { Order, OrderStatus } from '@cetus/api-client/types/orders'
import {
  manualPaymentMethodLabels,
  orderStatusLabels,
} from '@cetus/shared/constants/order'
import { Alert, AlertDescription, AlertTitle } from '@cetus/ui/alert'
import { Button } from '@cetus/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@cetus/ui/dialog'
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@cetus/ui/drawer'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@cetus/ui/form'
import { RadioGroup, RadioGroupItem } from '@cetus/ui/radio-group'
import { Textarea } from '@cetus/ui/textarea'
import { Currency } from '@cetus/web/components/currency'
import { SubmitButton } from '@cetus/web/components/submit-button'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@cetus/web/components/ui/field'
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@cetus/web/components/ui/toggle-group'
import { useIsMobile } from '@cetus/web/hooks/use-mobile'
import { cn } from '@cetus/web/shared/utils'
import { arktypeResolver } from '@hookform/resolvers/arktype'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { type } from 'arktype'
import { AlertTriangleIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

const MaxNotesLength = 1024

const UpdateStatusSchema = type({
  orderId: 'string.uuid',
  newStatus: type(
    "'payment_confirmed'|'processing'|'shipped'|'ready_for_pickup'|'delivered'|'failed_delivery'|'canceled'|'returned'",
  ),
  notes: type(`string <= ${MaxNotesLength}`).optional(),
  paymentMethod: type("'cash_on_delivery'|'bank_transfer'|'nequi'|undefined"),
  paymentStatus: type("'verified'|'rejected'").optional(),
})

type NewStatus = (typeof UpdateStatusSchema.infer)['newStatus']
type NewPaymentMethod = (typeof UpdateStatusSchema.infer)['paymentMethod']

type ChecklistItem = {
  id: string
  label: string | ReactNode
}

type ChecklistChangeState = {
  hasFailed: boolean
  allChecked: boolean
}

function getChecklistItems(
  paymentMethod: string | undefined,
  order: Order,
): ChecklistItem[] {
  if (paymentMethod === 'nequi' || paymentMethod === 'bank_transfer') {
    return [
      {
        id: 'verify-1',
        label: (
          <span>
            Busca una transferencia por{' '}
            <Currency currency="COP" value={order.total} />
          </span>
        ),
      },
      {
        id: 'verify-2',
        label: (
          <span>
            ¿El monto recibido coincide con{' '}
            <Currency currency="COP" value={order.total} />?
          </span>
        ),
      },
      {
        id: 'verify-3',
        label: (
          <span>
            ¿El nombre del remitente coincide con {order.customer.name}?
          </span>
        ),
      },
      {
        id: 'verify-4',
        label: '¿La fecha y hora de la transferencia son recientes?',
      },
      {
        id: 'verify-5',
        label: '¿El dinero ya se refleja en tu saldo?',
      },
    ]
  }

  return []
}

function getToggleValue(
  isTouched: boolean,
  isChecked: boolean,
): 'yes' | 'no' | undefined {
  if (!isTouched) {
    return undefined
  }
  return isChecked ? 'yes' : 'no'
}

function getPaymentVerificationMessage(paymentMethod: string | undefined) {
  if (paymentMethod === 'nequi') {
    return 'Abre tu app de Nequi y verifica la transferencia:'
  }

  if (paymentMethod === 'bank_transfer') {
    return 'Abre la app de tu banco y verifica la transferencia:'
  }

  return ''
}

type PaymentVerificationChecklistProps = {
  items: ChecklistItem[]
  selectedPaymentMethod: string | undefined
  onStateChange: (state: ChecklistChangeState) => void
}

function PaymentVerificationChecklist({
  items,
  selectedPaymentMethod,
  onStateChange,
}: PaymentVerificationChecklistProps) {
  const [checklistState, setChecklistState] = useState<Record<string, boolean>>(
    {},
  )
  const [touchedItems, setTouchedItems] = useState<Set<string>>(new Set())

  const hasFailed = items.some(
    (item) => touchedItems.has(item.id) && !checklistState[item.id],
  )

  const handleToggle = (itemId: string, value: string) => {
    const newState = { ...checklistState, [itemId]: value === 'yes' }
    const newTouched = new Set([...touchedItems, itemId])

    setChecklistState(newState)
    setTouchedItems(newTouched)

    onStateChange({
      hasFailed: items.some(
        (item) => newTouched.has(item.id) && !newState[item.id],
      ),
      allChecked: items.length > 0 && items.every((item) => newState[item.id]),
    })
  }

  return (
    <FieldSet>
      <FieldLegend variant="label">Verificación de pago</FieldLegend>
      <FieldDescription>
        {getPaymentVerificationMessage(selectedPaymentMethod)}
      </FieldDescription>

      <FieldGroup className="gap-3">
        {items.map((item) => (
          <Field key={item.id} orientation="horizontal">
            <FieldLabel className="font-normal" htmlFor={item.id}>
              {item.label}
            </FieldLabel>

            <ToggleGroup
              id={item.id}
              onValueChange={(value) => handleToggle(item.id, value)}
              size="sm"
              type="single"
              value={getToggleValue(
                touchedItems.has(item.id),
                checklistState[item.id] ?? false,
              )}
              variant="outline"
            >
              <ToggleGroupItem aria-label="si" value="yes">
                Si
              </ToggleGroupItem>
              <ToggleGroupItem aria-label="no" value="no">
                No
              </ToggleGroupItem>
            </ToggleGroup>
          </Field>
        ))}
      </FieldGroup>

      {hasFailed && (
        <Alert variant="destructive">
          <AlertTriangleIcon />
          <AlertTitle>Posible fraude detectado</AlertTitle>
          <AlertDescription>
            Uno o más items de verificación no coinciden.
          </AlertDescription>
        </Alert>
      )}
    </FieldSet>
  )
}

type OrderStatusFormProps = {
  order: Order
  newStatus: OrderStatus | null
  onOpenChange: (open: boolean) => void
  isMobile: boolean
}

function OrderStatusForm({
  order,
  newStatus,
  onOpenChange,
  isMobile,
}: OrderStatusFormProps) {
  const queryClient = useQueryClient()
  const form = useForm({
    resolver: arktypeResolver(UpdateStatusSchema),
    defaultValues: {
      orderId: order.id,
      newStatus: (newStatus as unknown as NewStatus) ?? undefined,
      notes: '',
      paymentMethod: order.paymentMethod as unknown as NewPaymentMethod,
    },
  })

  const [checklistStatus, setChecklistStatus] = useState<
    'idle' | 'failed' | 'allChecked'
  >('idle')
  const hasFailed = checklistStatus === 'failed'
  const allChecked = checklistStatus === 'allChecked'

  const selectedPaymentMethod = form.watch('paymentMethod')
  const checklistItems =
    newStatus === 'payment_confirmed'
      ? getChecklistItems(selectedPaymentMethod, order)
      : []

  const handleChecklistChange = ({
    hasFailed: failed,
    allChecked: checked,
  }: ChecklistChangeState) => {
    if (failed) {
      setChecklistStatus('failed')
      form.setValue('newStatus', 'canceled')
      form.setValue('notes', 'No se pudo verificar el pago')
      form.setValue('paymentStatus', 'rejected')
    } else if (checked) {
      setChecklistStatus('allChecked')
      form.setValue('newStatus', 'payment_confirmed')
      form.setValue('notes', 'Pago verificado correctamente')
      form.setValue('paymentStatus', 'verified')
    } else {
      setChecklistStatus('idle')
      form.setValue('newStatus', newStatus as unknown as NewStatus)
      form.setValue('notes', '')
      form.setValue('paymentStatus', undefined)
    }
  }

  const handlePaymentMethodChange = (
    onChange: (value: string) => void,
    value: string,
  ) => {
    onChange(value)
    setChecklistStatus('idle')
    form.setValue('newStatus', newStatus as unknown as NewStatus)
    form.setValue('notes', '')
    form.setValue('paymentStatus', undefined)
  }

  const { mutateAsync } = useMutation({
    mutationKey: ['orders', 'status', order.id],
    mutationFn: api.orders.updateStatus,
    onSuccess: () => {
      onOpenChange(false)
      toast.success('Estado del pedido actualizado')
      queryClient.invalidateQueries({
        queryKey: ['orders'],
      })
    },
    onError: (error) => {
      form.setError('root', {
        type: 'server',
        message:
          error.message ?? 'No se pudo actualizar el estado. Intenta de nuevo.',
      })
    },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    await mutateAsync({
      orderId: order.id,
      newStatus: values.newStatus,
      notes: values.notes,
      paymentMethod: values.paymentMethod,
      paymentStatus: values.paymentStatus,
    })
  })

  const title = newStatus
    ? `Cambiar estado a "${orderStatusLabels[newStatus]}"`
    : 'Cambiar estado del pedido'

  const formFields = (
    <FieldGroup>
      {newStatus === 'payment_confirmed' && (
        <>
          <FormField
            control={form.control}
            name="paymentMethod"
            render={({ field, fieldState }) => (
              <FieldSet className="w-full max-w-xs">
                <FieldLegend variant="label">Método de pago</FieldLegend>
                <RadioGroup
                  onValueChange={(value) =>
                    handlePaymentMethodChange(field.onChange, value)
                  }
                  value={field.value}
                >
                  {Object.entries(manualPaymentMethodLabels).map(
                    ([key, label]) => (
                      <Field
                        data-invalid={fieldState.invalid}
                        key={key}
                        orientation="horizontal"
                      >
                        <RadioGroupItem
                          aria-invalid={fieldState.invalid}
                          id={key}
                          value={key}
                        />
                        <FieldLabel className="font-normal" htmlFor={key}>
                          {label}
                        </FieldLabel>
                      </Field>
                    ),
                  )}
                </RadioGroup>
              </FieldSet>
            )}
          />

          {checklistItems.length > 0 && (
            <PaymentVerificationChecklist
              items={checklistItems}
              key={selectedPaymentMethod}
              onStateChange={handleChecklistChange}
              selectedPaymentMethod={selectedPaymentMethod}
            />
          )}
        </>
      )}

      <FormField
        control={form.control}
        name="notes"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Notas (opcional)</FormLabel>
            <FormControl>
              <Textarea maxLength={MaxNotesLength} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </FieldGroup>
  )

  const submitLabel = allChecked
    ? 'Confirmar pago verificado'
    : 'Actualizar estado'

  const footerActions = (
    <>
      <Button
        onClick={() => onOpenChange(false)}
        type="button"
        variant="outline"
      >
        Cerrar
      </Button>
      {hasFailed ? (
        <SubmitButton
          disabled={form.formState.isSubmitting}
          isSubmitting={form.formState.isSubmitting}
          type="submit"
          variant="destructive"
        >
          Rechazar
        </SubmitButton>
      ) : (
        <SubmitButton
          className={cn({
            'bg-green-600 text-white hover:bg-green-700': allChecked,
          })}
          disabled={
            form.formState.isSubmitting ||
            (checklistItems.length > 0 && !allChecked)
          }
          isSubmitting={form.formState.isSubmitting}
          type="submit"
        >
          {submitLabel}
        </SubmitButton>
      )}
    </>
  )

  if (isMobile) {
    return (
      <Form {...form}>
        <DrawerHeader>
          <DrawerTitle>{title}</DrawerTitle>
        </DrawerHeader>

        <form className="grid gap-4 overflow-y-auto px-4" onSubmit={onSubmit}>
          {formFields}

          <DrawerFooter className="px-0">{footerActions}</DrawerFooter>
        </form>
      </Form>
    )
  }

  return (
    <Form {...form}>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>

      <form className="grid gap-4" onSubmit={onSubmit}>
        {formFields}

        <DialogFooter>{footerActions}</DialogFooter>
      </form>
    </Form>
  )
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  order: Order
  newStatus: OrderStatus | null
}

export function UpdateOrderStatusDialog({
  onOpenChange,
  open,
  order,
  newStatus,
}: Readonly<Props>) {
  const isMobile = useIsMobile()

  const formContent = (
    <OrderStatusForm
      isMobile={isMobile}
      key={`${newStatus}-${order.id}`}
      newStatus={newStatus}
      onOpenChange={onOpenChange}
      order={order}
    />
  )

  if (isMobile) {
    return (
      <Drawer onOpenChange={onOpenChange} open={open}>
        <DrawerContent>{formContent}</DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>{formContent}</DialogContent>
    </Dialog>
  )
}
