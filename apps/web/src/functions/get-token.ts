import { createIsomorphicFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import consola from 'consola'
import { authClient } from '@/shared/auth-client'

export const getToken = createIsomorphicFn()
  .server(async () => {
    const response = await authClient.token({
      fetchOptions: {
        headers: getRequestHeaders(),
      },
    })

    if (response.error) {
      consola.error(response.error)
    }

    return response.data?.token || ''
  })
  .client(async () => {
    const response = await authClient.token()

    if (response.error) {
      consola.error(response.error)
    }

    return response.data?.token || ''
  })
