import { deleteProduct, type Product } from '@/api/products'
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
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { LoaderCircleIcon, TrashIcon } from 'lucide-react'
import { useEffect, useState } from 'react'

type Props = {
  product: Product
}

export const ConfirmDeleteProductDialog = ({ product }: Props) => {
  const [open, setOpen] = useState(false)

  const deleteProductMutation = useMutation({
    mutationKey: ['products', 'delete', product.id],
    mutationFn: deleteProduct,
  })

  const handleDelete = () => deleteProductMutation.mutate(product.id)

  const queryClient = useQueryClient()

  useEffect(() => {
    if (deleteProductMutation.isSuccess) {
      setOpen(false)
      queryClient.invalidateQueries({
        queryKey: ['products'],
      })
    }
  }, [deleteProductMutation.isSuccess, queryClient])

  return (
    <AlertDialog onOpenChange={setOpen} open={open}>
      <AlertDialogTrigger asChild>
        <DropdownMenuItem
          aria-label="Delete product"
          onClick={() => setOpen(true)}
          onSelect={(e) => e.preventDefault()}
          variant="destructive"
        >
          <TrashIcon aria-hidden="true" size={16} />
          <span>Eliminar</span>
        </DropdownMenuItem>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            ¿Estás seguro de que deseas eliminar el producto?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Una vez eliminado, no podrás recuperar este producto
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <Button
            disabled={deleteProductMutation.isPending}
            onClick={handleDelete}
            variant="destructive"
          >
            {deleteProductMutation.isPending && (
              <LoaderCircleIcon
                aria-hidden="true"
                className="animate-spin"
                size={16}
              />
            )}
            Sí, eliminar
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
