import { auth } from '@/server/auth'
import { createServerFn } from '@tanstack/react-start'
import { getHeaders } from '@tanstack/react-start/server'

export const GetSession = createServerFn({ method: 'GET' }).handler(
  async () => {
    const headers = new Headers(getHeaders() as HeadersInit)
    const session = await auth.api.getSession({
      headers,
    })

    return {
      session: session?.session,
      user: session?.user,
    }
  },
)
