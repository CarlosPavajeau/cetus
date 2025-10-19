import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { updateProduct } from '@/api/products'
import { productQuery } from '@/hooks/products/use-product'

export function useUpdateProduct() {
  const client = useQueryClient()

  return useMutation({
    mutationKey: ['products', 'update'],
    mutationFn: updateProduct,
    onSuccess: async (data) => {
      toast.success('Producto actualizado con éxito')

      await Promise.all([
        client.invalidateQueries({
          queryKey: ['products'],
        }),
        client.invalidateQueries(productQuery(data.id)),
      ])
    },
  })
}
