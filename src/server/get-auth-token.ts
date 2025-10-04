import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'

export const GetAuthToken = createServerFn({ method: 'GET' }).handler(
  async () => {
    const response = await fetch('/api/auth/token', {
      headers: getRequestHeaders() as HeadersInit,
    })

    if (!response.ok) {
      return
    }

    const token = (await response.json()) as { token: string }
    return token
  },
)
