import { api } from '@cetus/web/lib/client-api'
import { useQuery } from '@tanstack/react-query'

export function useStates() {
  return useQuery({
    queryKey: ['states'],
    queryFn: api.states.list,
  })
}
