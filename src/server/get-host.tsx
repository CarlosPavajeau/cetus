import { env } from '@/shared/env'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'

export const getServerhost = createServerFn({ method: 'GET' }).handler(
  async () => {
    const host = getRequestHeader('Host') ?? 'localhost'
    const appUrl = new URL(env.APP_URL)

    return {
      host,
      isAppUrl: host === appUrl.host,
    }
  },
)
