import { api } from '@cetus/web/lib/client-api'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

export function useCreateCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: ['categories', 'create'],
    mutationFn: api.categories.create,

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['categories'],
      })
    },

    onError: (error) => {
      toast.error('Error al crear la categoría', {
        description: error.message || 'Por favor, intente nuevamente',
      })
    },
  })
}
