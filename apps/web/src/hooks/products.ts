import { useQuery } from '@tanstack/react-query'
import {
  fetchProductBySlug,
  fetchProducts,
  fetchProductsForSale,
  fetchTopSellingProducts,
} from '@/api/products'

export function useProductsForSale() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['products', 'for-sale'],
    queryFn: () => fetchProductsForSale(),
  })

  return {
    products: data,
    isLoading,
    error,
  }
}

export function useProducts() {
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

export function useTopSellingProducts() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['products', 'top-selling'],
    queryFn: () => fetchTopSellingProducts(),
  })

  return {
    products: data,
    isLoading,
    error,
  }
}

export function useProductBySlug(slug: string) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['products', 'slug', slug],
    queryFn: () => fetchProductBySlug(slug),
  })

  return {
    product: data,
    isLoading,
    error,
  }
}
