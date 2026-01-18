import { api } from '@cetus/api-client'
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
import { Textarea } from '@cetus/ui/textarea'
import { SubmitButton } from '@cetus/web/components/submit-button'
import { arktypeResolver } from '@hookform/resolvers/arktype'
import { useMutation } from '@tanstack/react-query'
import { type } from 'arktype'
import consola from 'consola'
import { useForm } from 'react-hook-form'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void

  orderId: string
}

const MaxCancelOrderReasonLength = 1024

const CancelOrderSchema = type({
  id: type('string.uuid'),
  reason: type(`string <= ${MaxCancelOrderReasonLength}`).configure({
    message: `El motivo debe tener menos de ${MaxCancelOrderReasonLength} caracteres.`,
  }),
})

export function CancelOrderDialog({
  open,
  onOpenChange,
  orderId,
}: Readonly<Props>) {
  const form = useForm({
    resolver: arktypeResolver(CancelOrderSchema),
    defaultValues: {
      id: orderId,
    },
  })

  const { mutateAsync } = useMutation({
    mutationKey: ['orders', 'cancel', orderId],
    mutationFn: api.orders.cancel,
    onSuccess: (_, __, ___, context) => {
      onOpenChange(false)
      context.client.invalidateQueries({
        queryKey: ['orders'],
      })
    },
    onError: (error) => {
      consola.error(error)
      form.setError('root', {
        type: 'server',
        message: 'No se pudo cancelar el pedido. Intenta de nuevo.',
      })
    },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    await mutateAsync(values)
  })

  return (
    <Form {...form}>
      <Dialog onOpenChange={onOpenChange} open={open}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar pedido</DialogTitle>
            <DialogDescription>
              Por favor, indique el motivo del cancelamiento. Este motivo será
              visible para el cliente y el administrador del sistema.
            </DialogDescription>
          </DialogHeader>

          <form className="grid gap-4" onSubmit={onSubmit}>
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo</FormLabel>
                  <FormControl>
                    <Textarea
                      maxLength={MaxCancelOrderReasonLength}
                      {...field}
                    />
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
                variant="destructive"
              >
                Cancelar pedido
              </SubmitButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Form>
  )
}
