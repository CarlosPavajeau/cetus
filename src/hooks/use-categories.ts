import { type Category, fetchCategories } from '@/api/categories'
import { useQuery } from '@tanstack/react-query'

export const useCategories = () => {
  const { data, isLoading, error } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  })

  return { categories: data, isLoading, error }
}
