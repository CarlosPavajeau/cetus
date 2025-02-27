import { fetchProduct } from '@/api/products'
import { useQuery } from '@tanstack/react-query'

export const useProduct = (id: string) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['product'],
    queryFn: () => fetchProduct(id),
  })

  return {
    product: data,
    isLoading,
    error,
  }
}
