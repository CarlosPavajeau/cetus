import { useMutation, useQueryClient } from '@tanstack/react-query'
import { LoaderCircleIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
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
            disabled={deleteCategoryMutation.isPending}
            onClick={handleDelete}
            variant="destructive"
          >
            {deleteCategoryMutation.isPending && (
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
