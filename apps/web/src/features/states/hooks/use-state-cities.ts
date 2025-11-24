import { api } from '@cetus/api-client'
import { useQuery } from '@tanstack/react-query'

export function useStateCities(stateId?: string) {
  return useQuery({
    queryKey: ['cities', stateId],
    queryFn: () => api.states.listCities(stateId ?? ''),
    enabled: !!stateId,
  })
}
