import { fetchStoreByDomain, fetchStoreBySlug } from '@/api/stores'
import { useQuery } from '@tanstack/react-query'

export function useStoreByDomain(domain: string) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['store', domain],
    queryFn: () => fetchStoreByDomain(domain),
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  })

  return {
    store: data,
    isLoading,
    error,
  }
}

export function useStoreBySlug(slug: string) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['store', slug],
    queryFn: () => fetchStoreBySlug(slug),
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  })

  return {
    store: data,
    isLoading,
    error,
  }
}
