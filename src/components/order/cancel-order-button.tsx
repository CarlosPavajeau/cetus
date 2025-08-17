import { cancelOrder } from '@/api/orders'
import { SubmitButton } from '@/components/submit-button'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangleIcon, TrashIcon } from 'lucide-react'
import { useState } from 'react'

type Props = {
  orderId: string
}

export function CancelOrderButton({ orderId }: Readonly<Props>) {
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
    <AlertDialog onOpenChange={setOpen} open={open}>
      <AlertDialogTrigger asChild>
        <Button className="group w-full" size="lg" variant="destructive">
          <TrashIcon
            aria-hidden="true"
            className="-ms-1 opacity-60"
            size={16}
          />
          Cancelar pedido
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangleIcon className="h-5 w-5 text-red-500" />
            Confirmar acción
          </AlertDialogTitle>
          <AlertDialogDescription>
            ¿Estás seguro de que deseas cancelar el pedido? Esta acción no se
            puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>

          <SubmitButton
            disabled={cancelOrderMutation.isPending}
            isSubmitting={cancelOrderMutation.isPending}
            onClick={handleCancelOrder}
            variant="destructive"
          >
            Confirmar
          </SubmitButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
