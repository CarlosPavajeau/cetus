import { env } from '@cetus/env/client'
import {
  adminClient,
  jwtClient,
  organizationClient,
} from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient({
  baseURL: env.VITE_APP_URL,
  plugins: [adminClient(), organizationClient(), jwtClient()],
})
