import { cancelOrder } from '@/api/orders'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { LoaderCircleIcon, TrashIcon } from 'lucide-react'
import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './ui/alert-dialog'
import { Button } from './ui/button'

type Props = {
  orderId: string
}

export function CancelOrderButton({ orderId }: Props) {
  const [open, setOpen] = useState(false)

  const queryClient = useQueryClient()
  const cancelOrderMutation = useMutation({
    mutationKey: ['orders', 'cancel', orderId],
    mutationFn: () => cancelOrder(orderId),
    onSuccess: () => {
      setOpen(false)
      queryClient.invalidateQueries({
        queryKey: ['orders'],
      })
    },
  })

  const handleCancelOrder = () => cancelOrderMutation.mutate()

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button className="group w-full" size="lg" variant="destructive">
          <TrashIcon
            className="-ms-1 opacity-60"
            size={16}
            aria-hidden="true"
          />
          Cancelar pedido
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            ¿Estás seguro de que deseas cancelar el pedido?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Una vez cancelado, no podrás recuperar este pedido
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>

          <Button
            variant="destructive"
            disabled={cancelOrderMutation.isPending}
            onClick={handleCancelOrder}
          >
            {cancelOrderMutation.isPending && (
              <LoaderCircleIcon
                className="animate-spin"
                size={16}
                aria-hidden="true"
              />
            )}
            Sí, cancelar pedido
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
