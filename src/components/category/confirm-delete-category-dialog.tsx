import { type Category, deleteCategory } from '@/api/categories'
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
import { LoaderCircleIcon } from 'lucide-react'
import { useEffect, useState } from 'react'

type Props = {
  category: Category
}

export const ConfirmDeleteCategoryDialog = ({ category }: Props) => {
  const [open, setOpen] = useState(false)

  const deleteCategoryMutation = useMutation({
    mutationKey: ['categories', 'delete', category.id],
    mutationFn: deleteCategory,
  })

  const handleDelete = () => deleteCategoryMutation.mutate(category.id)

  const queryClient = useQueryClient()

  useEffect(() => {
    if (deleteCategoryMutation.isSuccess) {
      setOpen(false)
      queryClient.invalidateQueries({
        queryKey: ['categories'],
      })
    }
  }, [deleteCategoryMutation.isSuccess, queryClient])

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <DropdownMenuItem
          onSelect={(e) => e.preventDefault()}
          onClick={() => setOpen(true)}
          aria-label="Delete category"
        >
          <span>Eliminar</span>
        </DropdownMenuItem>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            ¿Estás seguro de que deseas eliminar la categoría?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Una vez eliminada, no podrás recuperar esta categoría
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={deleteCategoryMutation.isPending}
            onClick={handleDelete}
          >
            {deleteCategoryMutation.isPending && (
              <LoaderCircleIcon
                className="animate-spin"
                size={16}
                aria-hidden="true"
              />
            )}
            Sí, eliminar
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
