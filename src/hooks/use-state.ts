import { fetchCities, fetchStates } from '@/api/states'
import { useQuery } from '@tanstack/react-query'

export function useStates() {
  const { data, isLoading } = useQuery({
    queryKey: ['states'],
    queryFn: fetchStates,
  })

  return {
    states: data,
    isLoading,
  }
}

export function useCities(stateId?: string) {
  const { data, isLoading } = useQuery({
    queryKey: ['cities', stateId],
    queryFn: () => fetchCities(stateId!),
    enabled: !!stateId,
  })

  return {
    cities: data,
    isLoading,
  }
}
