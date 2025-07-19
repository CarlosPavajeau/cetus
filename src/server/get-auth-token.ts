import { createServerFn } from '@tanstack/react-start'
import { getHeaders } from '@tanstack/react-start/server'

export const GetAuthToken = createServerFn({ method: 'GET' }).handler(
  async () => {
    const response = await fetch('/api/auth/token', {
      headers: getHeaders() as HeadersInit,
    })

    if (!response.ok) {
      return undefined
    }

    const token = (await response.json()) as { token: string }
    return token
  },
)
