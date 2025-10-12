import { cancelOrder } from '@/api/orders'
import { SubmitButton } from '@/components/submit-button'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Textarea } from '@/components/ui/textarea'
import { arktypeResolver } from '@hookform/resolvers/arktype'
import { useMutation } from '@tanstack/react-query'
import { type } from 'arktype'
import { BanIcon } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

type Props = {
  orderId: string
}

const MaxCancelOrderReasonLength = 1024

const CancelOrderSchema = type({
  id: type('string.uuid'),
  reason: type(`string < ${MaxCancelOrderReasonLength}`).configure({
    message: `El motivo no debe exceder los ${MaxCancelOrderReasonLength} caracteres.`,
  }),
})

export function CancelOrderDialog({ orderId }: Readonly<Props>) {
  const [open, setOpen] = useState(false)
  const form = useForm({
    resolver: arktypeResolver(CancelOrderSchema),
    defaultValues: {
      id: orderId,
    },
  })

  const { mutateAsync } = useMutation({
    mutationKey: ['orders', 'cancel', orderId],
    mutationFn: cancelOrder,
    onSuccess: (_, __, ___, context) => {
      setOpen(false)
      context.client.invalidateQueries({
        queryKey: ['orders'],
      })
    },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    await mutateAsync(values)
  })

  return (
    <Form {...form}>
      <Dialog onOpenChange={setOpen} open={open}>
        <DialogTrigger asChild>
          <Button className="group w-full" size="lg" variant="destructive">
            <BanIcon aria-hidden="true" size={16} />
            Cancelar pedido
          </Button>
        </DialogTrigger>

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
                    <Textarea {...field} />
                  </FormControl>

                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                onClick={() => setOpen(false)}
                type="button"
                variant="outline"
              >
                Cancelar
              </Button>
              <SubmitButton
                disabled={form.formState.isSubmitting}
                isSubmitting={form.formState.isSubmitting}
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
