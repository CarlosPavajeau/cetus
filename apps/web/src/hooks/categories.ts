import { useQuery } from '@tanstack/react-query'
import { type Category, fetchCategories } from '@/api/categories'

export const useCategories = () => {
  const { data, isLoading, error } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => fetchCategories(),
    refetchOnMount: false,
  })

  return { categories: data, isLoading, error }
}
