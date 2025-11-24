import { api } from '@cetus/api-client'
import type { Product } from '@cetus/api-client/types/products'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@cetus/ui/alert-dialog'
import { DropdownMenuItem } from '@cetus/ui/dropdown-menu'
import { productQueries } from '@cetus/web/features/products/queries'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { TrashIcon } from 'lucide-react'
import { useState } from 'react'

type Props = {
  product: Product
}

export function DeleteProductDialog({ product }: Props) {
  const [open, setOpen] = useState(false)

  const queryClient = useQueryClient()
  const deleteProductMutation = useMutation({
    mutationKey: ['products', 'delete', product.id],
    mutationFn: () => api.products.delete(product.id),
    onSuccess: () => {
      queryClient.invalidateQueries(productQueries.list)
      setOpen(false)
    },
  })

  return (
    <AlertDialog onOpenChange={setOpen} open={open}>
      <AlertDialogTrigger asChild>
        <DropdownMenuItem
          aria-label="Delete category"
          onClick={() => setOpen(true)}
          onSelect={(e) => e.preventDefault()}
          variant="destructive"
        >
          <TrashIcon aria-hidden="true" />
          <span>Eliminar</span>
        </DropdownMenuItem>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar eliminación</AlertDialogTitle>
          <AlertDialogDescription>
            ¿Deseas eliminar la el producto <strong>{product.name}</strong>?
            Esta acción no puede ser revertida.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={deleteProductMutation.isPending}
            onClick={() => deleteProductMutation.mutate()}
          >
            {deleteProductMutation.isPending ? 'Eliminando...' : 'Eliminar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
