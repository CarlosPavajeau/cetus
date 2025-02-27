import { fetchProductsForSale } from '@/api/products'
import { useQuery } from '@tanstack/react-query'

export const useProductsForSale = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['products', 'for-sale'],
    queryFn: fetchProductsForSale,
  })

  return {
    products: data,
    isLoading,
    error,
  }
}
