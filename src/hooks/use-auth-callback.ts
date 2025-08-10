import { type } from 'arktype'
import { useMemo } from 'react'

const AuthSearchSchema = type({
  invitation: type.string.or(type.undefined).optional(),
})

export function useAuthCallback(invitation?: string) {
  return useMemo(() => {
    if (invitation) {
      return `/accept-invitation/${invitation}`
    }
    return '/app'
  }, [invitation])
}

export { AuthSearchSchema }
