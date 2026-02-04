import { api } from '@cetus/api-client'
import type { Order, OrderStatus } from '@cetus/api-client/types/orders'
import {
  manualPaymentMethodLabels,
  orderStatusLabels,
} from '@cetus/shared/constants/order'
import { Alert, AlertDescription, AlertTitle } from '@cetus/ui/alert'
import { Button } from '@cetus/ui/button'
import { Checkbox } from '@cetus/ui/checkbox'
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
import { useIsMobile } from '@cetus/web/hooks/use-mobile'
import { cn } from '@cetus/web/shared/utils'
import { arktypeResolver } from '@hookform/resolvers/arktype'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { type } from 'arktype'
import { AlertTriangleIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
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
})

type NewStatus = (typeof UpdateStatusSchema.infer)['newStatus']
type NewPaymentMethod = (typeof UpdateStatusSchema.infer)['paymentMethod']

type ChecklistItem = {
  id: string
  label: string | ReactNode
  canFail: boolean
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
        canFail: false,
      },
      {
        id: 'verify-2',
        label: (
          <span>
            ¿El monto recibido coincide con{' '}
            <Currency currency="COP" value={order.total} />?
          </span>
        ),
        canFail: true,
      },
      {
        id: 'verify-3',
        label: (
          <span>
            ¿El nombre del remitente coincide con {order.customer.name}?
          </span>
        ),
        canFail: true,
      },
      {
        id: 'verify-4',
        label: '¿La fecha y hora de la transferencia son recientes?',
        canFail: true,
      },
      {
        id: 'verify-5',
        label: '¿El dinero ya se refleja en tu saldo?',
        canFail: true,
      },
    ]
  }

  return []
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

  const [checklistState, setChecklistState] = useState<Record<string, boolean>>(
    {},
  )
  const [touchedItems, setTouchedItems] = useState<Set<string>>(new Set())

  const selectedPaymentMethod = form.watch('paymentMethod')
  const checklistItems =
    newStatus === 'payment_confirmed'
      ? getChecklistItems(selectedPaymentMethod, order)
      : []
  const allChecked =
    checklistItems.length > 0 &&
    checklistItems.every((item) => checklistState[item.id])
  const hasFailed = checklistItems.some(
    (item) =>
      item.canFail && touchedItems.has(item.id) && !checklistState[item.id],
  )

  useEffect(() => {
    if (hasFailed) {
      form.setValue('newStatus', 'canceled')
      form.setValue('notes', 'No se pudo verificar el pago')
    } else if (allChecked) {
      form.setValue('newStatus', 'payment_confirmed')
      form.setValue('notes', 'Pago verificado correctamente')
    }
  }, [hasFailed, allChecked, form.setValue])

  useEffect(() => {
    const items =
      newStatus === 'payment_confirmed'
        ? getChecklistItems(selectedPaymentMethod, order)
        : []

    // Only reset if the set of items actually changed (different payment method category)
    setChecklistState((prev) => {
      const newState: Record<string, boolean> = {}
      for (const item of items) {
        newState[item.id] = prev[item.id] ?? false
      }
      return newState
    })
    setTouchedItems((prev) => {
      const validIds = new Set(items.map((i) => i.id))
      return new Set([...prev].filter((id) => validIds.has(id)))
    })
  }, [selectedPaymentMethod, order, newStatus])

  useEffect(() => {
    form.reset({
      orderId: order.id,
      newStatus: (newStatus as unknown as NewStatus) ?? undefined,
      notes: '',
      paymentMethod: order.paymentMethod as unknown as NewPaymentMethod,
    })
    setChecklistState({})
    setTouchedItems(new Set())
  }, [newStatus, order, form])

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
    })
  })

  const isMobile = useIsMobile()

  const title = newStatus
    ? `Cambiar estado a "${orderStatusLabels[newStatus]}"`
    : 'Cambiar estado del pedido'

  const formContent = (
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
                  defaultValue={field.value}
                  onValueChange={field.onChange}
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
            <FieldSet>
              <FieldLegend variant="label">Verificación de pago</FieldLegend>
              <FieldDescription>
                {getPaymentVerificationMessage(selectedPaymentMethod)}
              </FieldDescription>

              <FieldGroup className="gap-3">
                {checklistItems.map((item) => (
                  <Field key={item.id} orientation="horizontal">
                    <Checkbox
                      checked={checklistState[item.id] ?? false}
                      id={item.id}
                      onCheckedChange={(checked) => {
                        setChecklistState((prev) => ({
                          ...prev,
                          [item.id]: checked === true,
                        }))
                        setTouchedItems((prev) => {
                          const next = new Set(prev)
                          next.add(item.id)
                          return next
                        })
                      }}
                    />
                    <FieldLabel className="font-normal" htmlFor={item.id}>
                      {item.label}
                    </FieldLabel>
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
          {allChecked ? 'Confirmar pago verificado' : 'Actualizar estado'}
        </SubmitButton>
      )}
    </>
  )

  if (isMobile) {
    return (
      <Form {...form}>
        <Drawer onOpenChange={onOpenChange} open={open}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>{title}</DrawerTitle>
            </DrawerHeader>

            <form
              className="grid gap-4 overflow-y-auto px-4"
              onSubmit={onSubmit}
            >
              {formContent}

              <DrawerFooter className="px-0">{footerActions}</DrawerFooter>
            </form>
          </DrawerContent>
        </Drawer>
      </Form>
    )
  }

  return (
    <Form {...form}>
      <Dialog onOpenChange={onOpenChange} open={open}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>

          <form className="grid gap-4" onSubmit={onSubmit}>
            {formContent}

            <DialogFooter>{footerActions}</DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Form>
  )
}
