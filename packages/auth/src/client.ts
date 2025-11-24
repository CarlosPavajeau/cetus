import { env } from '@cetus/env/client'
import {
  adminClient,
  inferAdditionalFields,
  jwtClient,
  organizationClient,
} from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'
import type { auth } from '.'

export const authClient = createAuthClient({
  baseURL: env.VITE_APP_URL,
  plugins: [
    adminClient(),
    organizationClient(),
    jwtClient(),
    inferAdditionalFields<typeof auth>(),
  ],
})
