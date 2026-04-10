import { api } from '@cetus/web/lib/client-api'
import { useQuery } from '@tanstack/react-query'

export function useStateCities(stateId?: string) {
  return useQuery({
    queryKey: ['cities', stateId],
    queryFn: () => api.states.listCities(stateId ?? ''),
    enabled: !!stateId,
  })
}
