import { fetchProducts } from '@/api/products'
import { useQuery } from '@tanstack/react-query'

export const useProducts = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
  })

  return {
    products: data,
    isLoading,
    error,
  }
}
