import { auth } from '@cetus/auth'
import { authClient } from '@cetus/auth/client'
import { createIsomorphicFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'

export const getToken = createIsomorphicFn()
  .server(async () => {
    const { token } = await auth.api.getToken({
      headers: getRequestHeaders(),
    })
    return token
  })
  .client(async () => {
    const { data } = await authClient.token()

    if (!data) {
      return null
    }

    return data.token
  })
