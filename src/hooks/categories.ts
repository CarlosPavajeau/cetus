import { type Category, fetchCategories } from '@/api/categories'
import { useQuery } from '@tanstack/react-query'

export const useCategories = (storeSlug?: string) => {
  const { data, isLoading, error } = useQuery<Category[]>({
    queryKey: ['categories', storeSlug],
    queryFn: () => fetchCategories(storeSlug),
    refetchOnMount: false,
  })

  return { categories: data, isLoading, error }
}
