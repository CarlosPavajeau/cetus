import { api } from '@cetus/api-client'
import { useMutation, useQueryClient } from '@tanstack/react-query'

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
  })
}
