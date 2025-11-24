import { api } from '@cetus/api-client'
import { queryOptions, useQuery } from '@tanstack/react-query'

export const categoriesQuery = queryOptions({
  queryKey: ['categories'],
  queryFn: () => api.categories.list(),
})

export function useCategories() {
  return useQuery(categoriesQuery)
}
