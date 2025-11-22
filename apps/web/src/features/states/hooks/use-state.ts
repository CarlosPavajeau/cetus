import { api } from '@cetus/api-client'
import { useQuery } from '@tanstack/react-query'

export function useStates() {
  return useQuery({
    queryKey: ['states'],
    queryFn: api.states.list,
  })
}
