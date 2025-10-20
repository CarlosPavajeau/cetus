import { auth } from '@cetus/auth'
import { createIsomorphicFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import consola from 'consola'
import { authClient } from '@/shared/auth-client'

export const getToken = createIsomorphicFn()
  .server(async () => {
    const { token } = await auth.api.getToken({
      headers: getRequestHeaders(),
    })

    return token
  })
  .client(async () => {
    const response = await authClient.token()

    if (response.error) {
      consola.error(response.error)
    }

    return response.data?.token || ''
  })
