import { api } from '@cetus/api-client'
import type { OrderStatus } from '@cetus/api-client/types/orders'
import {
  manualPaymentMethodLabels,
  orderStatusLabels,
} from '@cetus/shared/constants/order'
import { Button } from '@cetus/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@cetus/ui/dialog'
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
import { SubmitButton } from '@cetus/web/components/submit-button'
import { arktypeResolver } from '@hookform/resolvers/arktype'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { type } from 'arktype'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

const MaxNotesLength = 1024

const UpdateStatusSchema = type({
  orderId: 'string.uuid',
  newStatus: type(
    "'payment_confirmed'|'processing'|'shipped'|'ready_for_pickup'|'delivered'|'failed_delivery'|'canceled'|'returned'",
  ),
  notes: type(`string <= ${MaxNotesLength}`).optional(),
  paymentMethod: type("'cash_on_delivery'|'bank_transfer'|undefined"),
})

type NewStatus = (typeof UpdateStatusSchema.infer)['newStatus']

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  orderId: string
  status: OrderStatus | null
}

export function UpdateOrderStatusDialog({
  onOpenChange,
  open,
  orderId,
  status,
}: Readonly<Props>) {
  const queryClient = useQueryClient()
  const form = useForm({
    resolver: arktypeResolver(UpdateStatusSchema),
    defaultValues: {
      orderId,
      newStatus: (status as unknown as NewStatus) ?? undefined,
      notes: '',
      paymentMethod: undefined,
    },
  })

  useEffect(() => {
    form.reset({
      orderId,
      newStatus: (status as unknown as NewStatus) ?? undefined,
      notes: '',
      paymentMethod: undefined,
    })
  }, [status, orderId, form])

  const { mutateAsync } = useMutation({
    mutationKey: ['orders', 'status', orderId],
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
      orderId,
      newStatus: values.newStatus,
      notes: values.notes,
    })
  })

  const dialogTitle = status
    ? `Cambiar estado a "${orderStatusLabels[status]}"`
    : 'Cambiar estado del pedido'
  const dialogDescription =
    status === 'payment_confirmed'
      ? 'Confirme el método de pago y agregue notas si es necesario.'
      : 'Agregue notas adicionales para este cambio de estado (opcional).'

  return (
    <Form {...form}>
      <Dialog onOpenChange={onOpenChange} open={open}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>{dialogDescription}</DialogDescription>
          </DialogHeader>

          <form className="grid gap-4" onSubmit={onSubmit}>
            {status === 'payment_confirmed' && (
              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Método de pago</FormLabel>
                    <FormControl>
                      <RadioGroup
                        className="flex flex-col space-y-1"
                        defaultValue={field.value}
                        onValueChange={field.onChange}
                      >
                        {Object.entries(manualPaymentMethodLabels).map(
                          ([key, label]) => (
                            <FormItem
                              className="flex items-center space-x-3 space-y-0"
                              key={key}
                            >
                              <FormControl>
                                <RadioGroupItem value={key} />
                              </FormControl>
                              <FormLabel className="font-normal">
                                {label}
                              </FormLabel>
                            </FormItem>
                          ),
                        )}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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

            <DialogFooter>
              <Button
                onClick={() => onOpenChange(false)}
                type="button"
                variant="outline"
              >
                Cerrar
              </Button>
              <SubmitButton
                disabled={form.formState.isSubmitting}
                isSubmitting={form.formState.isSubmitting}
                type="submit"
              >
                Actualizar estado
              </SubmitButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Form>
  )
}
