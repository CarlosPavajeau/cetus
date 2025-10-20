import { auth } from '@cetus/auth'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'

export const getToken = createServerFn({ method: 'GET' }).handler(async () => {
  const response = await auth.api.getToken({
    headers: getRequestHeaders(),
  })

  return response.token
})
