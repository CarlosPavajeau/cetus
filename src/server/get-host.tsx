import { env } from '@/shared/env'
import { createServerFn } from '@tanstack/react-start'
import { getHeader } from '@tanstack/react-start/server'

export const getServerhost = createServerFn({ method: 'GET' }).handler(
  async () => {
    const host = getHeader('Host') ?? 'localhost'
    const appUrl = new URL(env.APP_URL)

    return {
      host,
      isAppUrl: host === appUrl.host,
    }
  },
)
