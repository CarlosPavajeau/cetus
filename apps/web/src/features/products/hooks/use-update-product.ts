import { api } from '@cetus/api-client'
import type { UpdateProduct } from '@cetus/api-client/types/products'
import { productQueries } from '@cetus/web/features/products/queries'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

export function useUpdateProduct() {
  const client = useQueryClient()

  return useMutation({
    mutationKey: ['products', 'update'],
    mutationFn: (data: UpdateProduct) => api.products.update(data.id, data),
    onSuccess: (data) => {
      toast.success('Producto actualizado con éxito')

      client.invalidateQueries(productQueries.list)
      client.invalidateQueries(productQueries.detail(data.id))
    },
  })
}
