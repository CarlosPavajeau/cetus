import { env } from '@/shared/env'
import { organizationClient } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient({
  baseURL: env.BETTER_AUTH_URL!,
  plugins: [organizationClient()],
})
