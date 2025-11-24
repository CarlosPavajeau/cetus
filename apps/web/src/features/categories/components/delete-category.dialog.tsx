import { api } from '@cetus/api-client'
import type { Category } from '@cetus/api-client/types/categories'
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
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

type Props = {
  category: Category
}

export function DeleteCategoryDialog({ category }: Props) {
  const [open, setOpen] = useState(false)

  const queryClient = useQueryClient()
  const deleteCategoryMutation = useMutation({
    mutationKey: ['categories', 'delete', category.id],
    mutationFn: () => api.categories.delete(category.id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['categories'],
      })
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
        >
          <span>Eliminar</span>
        </DropdownMenuItem>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar eliminación</AlertDialogTitle>
          <AlertDialogDescription>
            ¿Deseas eliminar la categoría <strong>{category.name}</strong>? Esta
            acción no puede ser revertida.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={deleteCategoryMutation.isPending}
            onClick={() => deleteCategoryMutation.mutate()}
          >
            {deleteCategoryMutation.isPending ? 'Eliminando...' : 'Eliminar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
