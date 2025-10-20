import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { authClient } from '@/shared/auth-client'

export const getToken = createServerFn({ method: 'GET' }).handler(async () => {
  const response = await authClient.token({
    fetchOptions: {
      headers: getRequestHeaders(),
    },
  })

  if (response.error) {
    throw new Error(response.error.message)
  }

  return response.data.token
})
