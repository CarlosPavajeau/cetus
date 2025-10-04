import { fetchProduct } from '@/api/products'
import { queryOptions, useQuery } from '@tanstack/react-query'

export const productQuery = (id: string) =>
  queryOptions({
    queryKey: ['product', id],
    queryFn: () => fetchProduct(id),
  })

export function useProduct(id: string) {
  const { data, isLoading, error } = useQuery(productQuery(id))

  return {
    product: data,
    isLoading,
    error,
  }
}
